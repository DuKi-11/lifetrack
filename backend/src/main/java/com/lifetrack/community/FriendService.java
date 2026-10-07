package com.lifetrack.community;

import com.lifetrack.common.ApiException;
import com.lifetrack.community.CommunityDtos.FriendItem;
import com.lifetrack.community.CommunityDtos.FriendsView;
import com.lifetrack.community.CommunityDtos.UserLite;
import com.lifetrack.user.User;
import com.lifetrack.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;

@Service
public class FriendService {

    private final FriendshipRepository friendships;
    private final UserRepository users;

    public FriendService(FriendshipRepository friendships, UserRepository users) {
        this.friendships = friendships;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public FriendsView list(Long userId) {
        List<Friendship> accepted = friendships.findInvolving(userId, Friendship.Status.ACCEPTED);
        List<Friendship> incoming = friendships.findByAddresseeIdAndStatus(userId, Friendship.Status.PENDING);
        List<Friendship> outgoing = friendships.findByRequesterIdAndStatus(userId, Friendship.Status.PENDING);

        Set<Long> ids = new HashSet<>();
        accepted.forEach(f -> ids.add(other(f, userId)));
        incoming.forEach(f -> ids.add(f.getRequesterId()));
        outgoing.forEach(f -> ids.add(f.getAddresseeId()));
        Map<Long, User> byId = new HashMap<>();
        users.findAllById(ids).forEach(u -> byId.put(u.getId(), u));

        return new FriendsView(
                items(accepted, f -> other(f, userId), byId),
                items(incoming, Friendship::getRequesterId, byId),
                items(outgoing, Friendship::getAddresseeId, byId));
    }

    @Transactional
    public void request(Long userId, String email, Long targetId) {
        User target;
        if (targetId != null) {
            target = users.findById(targetId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That user was not found"));
        } else if (email != null && !email.isBlank()) {
            target = users.findByEmailIgnoreCase(email.trim())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No LifeTrack user has that email"));
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose who to add");
        }
        if (target.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can't add yourself");
        }

        Optional<Friendship> existing = friendships.findByRequesterIdAndAddresseeId(userId, target.getId());
        Optional<Friendship> reverse = friendships.findByRequesterIdAndAddresseeId(target.getId(), userId);
        if (existing.isPresent() || (reverse.isPresent() && reverse.get().getStatus() == Friendship.Status.ACCEPTED)) {
            boolean friends = existing.map(f -> f.getStatus() == Friendship.Status.ACCEPTED).orElse(true);
            throw new ApiException(HttpStatus.CONFLICT, friends ? "You are already friends" : "You already sent a request");
        }
        // They already asked me: adding them back just accepts
        if (reverse.isPresent()) {
            reverse.get().setStatus(Friendship.Status.ACCEPTED);
            return;
        }
        friendships.save(new Friendship(userId, target.getId()));
    }

    @Transactional
    public void accept(Long userId, Long friendshipId) {
        Friendship f = friendships.findById(friendshipId)
                .filter(x -> x.getAddresseeId().equals(userId) && x.getStatus() == Friendship.Status.PENDING)
                .orElseThrow(() -> ApiException.notFound("Friend request"));
        f.setStatus(Friendship.Status.ACCEPTED);
    }

    /** Declines or cancels a request, or removes a friend. Either person can do it. */
    @Transactional
    public void remove(Long userId, Long friendshipId) {
        Friendship f = friendships.findById(friendshipId)
                .filter(x -> x.getRequesterId().equals(userId) || x.getAddresseeId().equals(userId))
                .orElseThrow(() -> ApiException.notFound("Friend"));
        friendships.delete(f);
    }

    /**
     * Finds other LifeTrack users by name, email or ID (like "#12"), for adding friends and inviting.
     * Text needs at least 2 characters; "#12" or "12" also finds the person with that ID.
     */
    @Transactional(readOnly = true)
    public List<UserLite> search(Long userId, String query) {
        String q = query == null ? "" : query.trim().replace("%", "").replace("_", "");
        boolean idOnly = q.startsWith("#");
        String digits = (idOnly ? q.substring(1) : q).trim();
        Long idMatch = digits.matches("\\d{1,15}") ? Long.parseLong(digits) : -1L;
        // "#12" looks only for that ID; otherwise the text must be long enough to be a useful name search
        String text = idOnly || q.length() < 2 ? "\u0000" : q;
        if (idMatch < 0 && text.equals("\u0000")) return List.of();
        return users.search(userId, text, idMatch, PageRequest.of(0, 10)).stream().map(FriendService::lite).toList();
    }

    public boolean areFriends(Long a, Long b) {
        return friendships.existsBetween(a, b, Friendship.Status.ACCEPTED);
    }

    private static Long other(Friendship f, Long me) {
        return f.getRequesterId().equals(me) ? f.getAddresseeId() : f.getRequesterId();
    }

    private static List<FriendItem> items(List<Friendship> list, Function<Friendship, Long> userOf, Map<Long, User> byId) {
        return list.stream()
                .filter(f -> byId.containsKey(userOf.apply(f)))
                .map(f -> new FriendItem(f.getId(), lite(byId.get(userOf.apply(f)))))
                .sorted(Comparator.comparing(i -> i.user().name().toLowerCase(Locale.ROOT)))
                .toList();
    }

    static UserLite lite(User u) {
        return new UserLite(u.getId(), u.getName(), u.getAvatar(), u.getEquippedCrown());
    }
}
