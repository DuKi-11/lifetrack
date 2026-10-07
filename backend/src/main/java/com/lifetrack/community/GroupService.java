package com.lifetrack.community;

import com.lifetrack.common.ApiException;
import com.lifetrack.community.CommunityDtos.*;
import com.lifetrack.habit.Streaks;
import com.lifetrack.reward.RewardCatalog;
import com.lifetrack.user.User;
import com.lifetrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private static final int STREAK_WINDOW_DAYS = 400;
    private static final int MAX_MEMBERS = 20;
    private static final int POINTS_PER_PHOTO = RewardCatalog.POINTS_PER_PHOTO;
    private static final int POINTS_PER_LIKE = RewardCatalog.POINTS_PER_LIKE;

    private final GoalGroupRepository groups;
    private final GroupMemberRepository members;
    private final GroupPostRepository posts;
    private final PostLikeRepository likes;
    private final UserRepository users;

    public GroupService(GoalGroupRepository groups, GroupMemberRepository members, GroupPostRepository posts,
                        PostLikeRepository likes, UserRepository users) {
        this.groups = groups;
        this.members = members;
        this.posts = posts;
        this.likes = likes;
        this.users = users;
    }

    // ---- Groups ----

    @Transactional(readOnly = true)
    public List<GroupSummary> list(Long userId, LocalDate today) {
        return members.findByUserId(userId).stream()
                .map(m -> groups.findById(m.getGroupId()).map(g -> summarize(g, userId, today)).orElse(null))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing((GroupSummary g) -> !"INVITED".equals(g.myStatus()))
                        .thenComparing(GroupSummary::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public GroupSummary create(Long userId, GroupRequest req, LocalDate today) {
        checkDate(today);
        GoalGroup group = groups.save(new GoalGroup(req.name().trim(), blankToNull(req.goal()), userId));
        members.save(GroupMember.active(group.getId(), userId, today));
        return summarize(group, userId, today);
    }

    @Transactional(readOnly = true)
    public GroupDetail detail(Long userId, Long groupId, LocalDate today) {
        GoalGroup group = groups.findById(groupId).orElseThrow(() -> ApiException.notFound("Group"));
        GroupMember me = members.findByGroupIdAndUserId(groupId, userId).orElseThrow(() -> ApiException.notFound("Group"));
        GroupSummary summary = summarize(group, userId, today);
        if (me.getStatus() != GroupMember.Status.ACTIVE) {
            return new GroupDetail(summary, List.of(), List.of());
        }

        List<GroupMember> all = members.findByGroupId(groupId);
        Map<Long, User> usersById = loadUsers(all.stream().map(GroupMember::getUserId).toList());
        Stats stats = stats(groupId, all, today);

        List<MemberView> memberViews = all.stream()
                .filter(m -> usersById.containsKey(m.getUserId()))
                .map(m -> new MemberView(FriendService.lite(usersById.get(m.getUserId())),
                        m.getUserId().equals(group.getOwnerId()),
                        m.getStatus() == GroupMember.Status.INVITED,
                        stats.days(m.getUserId()).contains(today),
                        Streaks.current(stats.days(m.getUserId()), today)))
                .sorted(Comparator.comparing((MemberView v) -> v.invited())
                        .thenComparing((MemberView v) -> -v.streak())
                        .thenComparing(v -> v.user().name(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<GroupPost> recent = posts.findTop30ByGroupIdOrderByPostDayDescCreatedAtDesc(groupId);
        List<Long> postIds = recent.stream().map(GroupPost::getId).toList();
        Map<Long, Long> likeCounts = new HashMap<>();
        Set<Long> likedByMe = new HashSet<>();
        if (!postIds.isEmpty()) {
            for (PostLike l : likes.findByPostIdIn(postIds)) {
                likeCounts.merge(l.getPostId(), 1L, Long::sum);
                if (l.getUserId().equals(userId)) likedByMe.add(l.getPostId());
            }
        }
        Map<Long, User> authors = new HashMap<>(usersById);
        List<Long> missing = recent.stream().map(GroupPost::getUserId).filter(id -> !authors.containsKey(id)).distinct().toList();
        authors.putAll(loadUsers(missing));

        List<PostView> postViews = recent.stream()
                .filter(p -> authors.containsKey(p.getUserId()))
                .map(p -> new PostView(p.getId(), FriendService.lite(authors.get(p.getUserId())), p.getPostDay(),
                        p.getPhoto(), p.getCaption(), likeCounts.getOrDefault(p.getId(), 0L), likedByMe.contains(p.getId())))
                .toList();

        return new GroupDetail(summary, memberViews, postViews);
    }

    @Transactional
    public void delete(Long userId, Long groupId) {
        GoalGroup group = groups.findById(groupId).orElseThrow(() -> ApiException.notFound("Group"));
        requireActive(groupId, userId);
        if (!group.getOwnerId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the group owner can delete the group");
        }
        likes.deleteByGroupId(groupId);
        posts.deleteByGroupId(groupId);
        members.deleteByGroupId(groupId);
        groups.delete(group);
    }

    // ---- Members ----

    @Transactional
    public void invite(Long userId, Long groupId, Long friendUserId) {
        requireActive(groupId, userId);
        if (userId.equals(friendUserId) || !users.existsById(friendUserId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a LifeTrack user to invite");
        }
        if (members.findByGroupIdAndUserId(groupId, friendUserId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "They are already in this group or invited");
        }
        if (members.countByGroupId(groupId) >= MAX_MEMBERS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This group is full (" + MAX_MEMBERS + " people)");
        }
        members.save(GroupMember.invited(groupId, friendUserId, userId));
    }

    @Transactional
    public void acceptInvite(Long userId, Long groupId, LocalDate today) {
        checkDate(today);
        GroupMember m = members.findByGroupIdAndUserId(groupId, userId)
                .filter(x -> x.getStatus() == GroupMember.Status.INVITED)
                .orElseThrow(() -> ApiException.notFound("Invitation"));
        m.accept(today);
    }

    /** Leaves the group, or declines an invitation. The owner can't leave; they delete the group instead. */
    @Transactional
    public void leave(Long userId, Long groupId) {
        GoalGroup group = groups.findById(groupId).orElseThrow(() -> ApiException.notFound("Group"));
        GroupMember m = members.findByGroupIdAndUserId(groupId, userId).orElseThrow(() -> ApiException.notFound("Group"));
        if (group.getOwnerId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You own this group. Delete it instead of leaving.");
        }
        members.delete(m);
    }

    // ---- Posts and likes ----

    @Transactional
    public PostView post(Long userId, Long groupId, PostRequest req, LocalDate today) {
        checkDate(today);
        requireActive(groupId, userId);
        String caption = blankToNull(req.caption());
        GroupPost post = posts.findByGroupIdAndUserIdAndPostDay(groupId, userId, today)
                .map(existing -> { existing.replace(req.photo(), caption); return existing; })
                .orElseGet(() -> posts.save(new GroupPost(groupId, userId, today, req.photo(), caption)));
        User me = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        return new PostView(post.getId(), FriendService.lite(me), post.getPostDay(), post.getPhoto(), post.getCaption(),
                likes.countByPostId(post.getId()), likes.findByPostIdAndUserId(post.getId(), userId).isPresent());
    }

    @Transactional
    public void deletePost(Long userId, Long postId) {
        GroupPost post = posts.findById(postId)
                .filter(p -> p.getUserId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Post"));
        likes.deleteByPostId(postId);
        posts.delete(post);
    }

    /** Likes the post, or removes the like if I already liked it. */
    @Transactional
    public LikeResult toggleLike(Long userId, Long postId) {
        GroupPost post = posts.findById(postId).orElseThrow(() -> ApiException.notFound("Post"));
        requireActive(post.getGroupId(), userId);
        Optional<PostLike> existing = likes.findByPostIdAndUserId(postId, userId);
        boolean liked;
        if (existing.isPresent()) {
            likes.delete(existing.get());
            liked = false;
        } else {
            likes.save(new PostLike(postId, userId));
            liked = true;
        }
        likes.flush();
        return new LikeResult(liked, likes.countByPostId(postId));
    }

    // ---- Leaderboard ----

    /** Ranks active members by points for the last 7 days (period "week") or ever ("all"). */
    @Transactional(readOnly = true)
    public List<LeaderboardRow> leaderboard(Long userId, Long groupId, LocalDate today, String period) {
        requireActive(groupId, userId);
        LocalDate from = "all".equals(period) ? LocalDate.of(1970, 1, 1) : today.minusDays(6);

        List<GroupMember> active = members.findByGroupId(groupId).stream()
                .filter(m -> m.getStatus() == GroupMember.Status.ACTIVE).toList();
        Map<Long, User> usersById = loadUsers(active.stream().map(GroupMember::getUserId).toList());
        Stats streaks = stats(groupId, active, today);

        Map<Long, Integer> photos = new HashMap<>();
        for (Object[] row : posts.findPostDays(groupId, from)) photos.merge((Long) row[0], 1, Integer::sum);
        Map<Long, Long> likeCounts = new HashMap<>();
        for (Object[] row : likes.countLikesReceived(groupId, from)) likeCounts.put((Long) row[0], (Long) row[1]);

        record Entry(User user, int points, int photos, long likes, int streak) {
        }
        List<Entry> entries = active.stream()
                .filter(m -> usersById.containsKey(m.getUserId()))
                .map(m -> {
                    int p = photos.getOrDefault(m.getUserId(), 0);
                    long l = likeCounts.getOrDefault(m.getUserId(), 0L);
                    return new Entry(usersById.get(m.getUserId()), p * POINTS_PER_PHOTO + (int) l * POINTS_PER_LIKE, p, l,
                            Streaks.current(streaks.days(m.getUserId()), today));
                })
                .sorted(Comparator.comparingInt(Entry::points).reversed()
                        .thenComparing(Comparator.comparingInt(Entry::streak).reversed())
                        .thenComparing(e -> e.user().getName(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        // Same points share a rank (1, 1, 3), so ties don't look unfair
        List<LeaderboardRow> rows = new ArrayList<>();
        for (Entry e : entries) {
            int rank = 1 + (int) entries.stream().filter(o -> o.points() > e.points()).count();
            rows.add(new LeaderboardRow(FriendService.lite(e.user()), rank, e.points(), e.photos(), e.likes(), e.streak()));
        }
        return rows;
    }

    // ---- Helpers ----

    private GroupSummary summarize(GoalGroup group, Long userId, LocalDate today) {
        GroupMember me = members.findByGroupIdAndUserId(group.getId(), userId).orElseThrow();
        if (me.getStatus() == GroupMember.Status.INVITED) {
            UserLite inviter = me.getInvitedBy() == null ? null
                    : users.findById(me.getInvitedBy()).map(FriendService::lite).orElse(null);
            return new GroupSummary(group.getId(), group.getName(), group.getGoal(), group.getOwnerId(), "INVITED", inviter,
                    0, 0, false, false, 0, 0);
        }
        List<GroupMember> all = members.findByGroupId(group.getId());
        Stats stats = stats(group.getId(), all, today);
        List<GroupMember> active = all.stream().filter(m -> m.getStatus() == GroupMember.Status.ACTIVE).toList();
        int postedToday = (int) active.stream().filter(m -> stats.days(m.getUserId()).contains(today)).count();
        boolean allToday = !active.isEmpty() && postedToday == active.size();
        return new GroupSummary(group.getId(), group.getName(), group.getGoal(), group.getOwnerId(), "ACTIVE", null,
                active.size(), postedToday, stats.days(userId).contains(today), allToday,
                groupStreak(active, stats, today), Streaks.current(stats.days(userId), today));
    }

    private Stats stats(Long groupId, List<GroupMember> all, LocalDate today) {
        Map<Long, Set<LocalDate>> byUser = new HashMap<>();
        for (Object[] row : posts.findPostDays(groupId, today.minusDays(STREAK_WINDOW_DAYS))) {
            byUser.computeIfAbsent((Long) row[0], k -> new HashSet<>()).add((LocalDate) row[1]);
        }
        return new Stats(byUser);
    }

    /**
     * Days in a row that every member posted. A member only counts from the day they joined, and like
     * personal streaks, today not being finished yet doesn't break the streak.
     */
    private static int groupStreak(List<GroupMember> active, Stats stats, LocalDate today) {
        LocalDate day = allPosted(active, stats, today) ? today : today.minusDays(1);
        int streak = 0;
        while (streak < STREAK_WINDOW_DAYS && allPosted(active, stats, day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    private static boolean allPosted(List<GroupMember> active, Stats stats, LocalDate day) {
        List<GroupMember> expected = active.stream()
                .filter(m -> m.getJoinedDay() != null && !m.getJoinedDay().isAfter(day))
                .toList();
        return !expected.isEmpty() && expected.stream().allMatch(m -> stats.days(m.getUserId()).contains(day));
    }

    private GroupMember requireActive(Long groupId, Long userId) {
        return members.findByGroupIdAndUserId(groupId, userId)
                .filter(m -> m.getStatus() == GroupMember.Status.ACTIVE)
                .orElseThrow(() -> ApiException.notFound("Group"));
    }

    private Map<Long, User> loadUsers(Collection<Long> ids) {
        Map<Long, User> byId = new HashMap<>();
        users.findAllById(ids).forEach(u -> byId.put(u.getId(), u));
        return byId;
    }

    /** The app sends the user's local date. Anything more than a day off the server's clock can't be a time zone. */
    private static void checkDate(LocalDate day) {
        if (Math.abs(ChronoUnit.DAYS.between(LocalDate.now(), day)) > 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your device's date looks wrong");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private record Stats(Map<Long, Set<LocalDate>> daysByUser) {
        Set<LocalDate> days(Long userId) {
            return daysByUser.getOrDefault(userId, Set.of());
        }
    }
}
