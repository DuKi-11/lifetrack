package com.lifetrack.reward;

import com.lifetrack.common.ApiException;
import com.lifetrack.community.GroupPostRepository;
import com.lifetrack.community.PostLikeRepository;
import com.lifetrack.reward.RewardDtos.EquipRequest;
import com.lifetrack.reward.RewardDtos.RewardItem;
import com.lifetrack.reward.RewardDtos.RewardsView;
import com.lifetrack.user.User;
import com.lifetrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
public class RewardService {

    private final UserRepository users;
    private final GroupPostRepository posts;
    private final PostLikeRepository likes;

    public RewardService(UserRepository users, GroupPostRepository posts, PostLikeRepository likes) {
        this.users = users;
        this.posts = posts;
        this.likes = likes;
    }

    @Transactional
    public RewardsView view(Long userId) {
        User user = load(userId);
        return build(user, currentPoints(user));
    }

    @Transactional
    public RewardsView equip(Long userId, EquipRequest req) {
        User user = load(userId);
        int points = currentPoints(user);
        boolean none = req.id() == null || req.id().isBlank() || "NONE".equals(req.id());

        if (req.kind() == RewardCatalog.Kind.CROWN && none) {
            user.setEquippedCrown(null);
        } else {
            RewardCatalog.Reward reward = RewardCatalog.find(req.kind(), req.id())
                    .orElseThrow(() -> ApiException.notFound("Reward"));
            if (reward.points() > points) {
                throw new ApiException(HttpStatus.FORBIDDEN, "You need " + reward.points() + " points to unlock " + reward.name());
            }
            if (reward.kind() == RewardCatalog.Kind.THEME) {
                user.setEquippedTheme("VIOLET".equals(reward.id()) ? null : reward.id());
            } else {
                user.setEquippedCrown(reward.id());
            }
        }
        return build(user, points);
    }

    /** Photos x 10 + likes from other people x 2, across all groups. Remembers the best score so rewards never disappear. */
    private int currentPoints(User user) {
        long photos = posts.countByUserId(user.getId());
        long liked = likes.countLikesReceivedBy(user.getId());
        user.raisePoints((int) (photos * RewardCatalog.POINTS_PER_PHOTO + liked * RewardCatalog.POINTS_PER_LIKE));
        return user.getPointsHighWater();
    }

    private RewardsView build(User user, int points) {
        List<RewardItem> themes = RewardCatalog.THEMES.stream().map(r -> item(r, points)).toList();
        List<RewardItem> crowns = RewardCatalog.CROWNS.stream().map(r -> item(r, points)).toList();
        RewardItem next = Stream.concat(themes.stream(), crowns.stream())
                .filter(i -> !i.unlocked())
                .min(Comparator.comparingInt(RewardItem::points))
                .orElse(null);
        return new RewardsView(points, user.getEquippedTheme() == null ? "VIOLET" : user.getEquippedTheme(),
                user.getEquippedCrown(), themes, crowns, next);
    }

    private static RewardItem item(RewardCatalog.Reward r, int points) {
        return new RewardItem(r.id(), r.name(), r.points(), r.points() <= points);
    }

    private User load(Long userId) {
        return users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
    }
}
