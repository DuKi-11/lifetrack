package com.lifetrack.community;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public final class CommunityDtos {

    private CommunityDtos() {
    }

    /** The public bits of a user that friends and group members can see. */
    public record UserLite(Long id, String name, String avatar, String crown) {
    }

    // ---- Friends ----

    /** Add someone by their user id (from search) or by email. */
    public record FriendRequestBody(
            Long userId,

            @Email(message = "Please enter a valid email")
            String email) {
    }

    /** friendshipId is what you pass to accept / remove. */
    public record FriendItem(Long friendshipId, UserLite user) {
    }

    public record FriendsView(List<FriendItem> friends, List<FriendItem> incoming, List<FriendItem> outgoing) {
    }

    // ---- Groups ----

    public record GroupRequest(
            @NotBlank(message = "Please give the group a name")
            @Size(max = 60, message = "Name is too long")
            String name,

            @Size(max = 200, message = "Goal is too long")
            String goal) {
    }

    public record InviteRequest(@NotNull(message = "Choose a friend to invite") Long userId) {
    }

    public record PostRequest(
            @NotBlank(message = "Please choose a photo")
            @Size(max = 1_500_000, message = "Photo is too large")
            @Pattern(regexp = "^data:image/(jpeg|png|webp);base64,.*$", message = "That doesn't look like a photo")
            String photo,

            @Size(max = 200, message = "Caption is too long")
            String caption) {
    }

    /**
     * A group as shown in the list.
     *
     * @param myStatus      ACTIVE, or INVITED if I haven't accepted yet
     * @param postedToday   how many members have posted today
     * @param groupStreak   days in a row that EVERY member posted
     * @param myStreak      days in a row that I posted in this group
     */
    public record GroupSummary(
            Long id,
            String name,
            String goal,
            Long ownerId,
            String myStatus,
            UserLite invitedBy,
            int memberCount,
            int postedToday,
            boolean myPostedToday,
            boolean allPostedToday,
            int groupStreak,
            int myStreak) {
    }

    public record MemberView(UserLite user, boolean owner, boolean invited, boolean postedToday, int streak) {
    }

    public record PostView(
            Long id,
            UserLite user,
            LocalDate day,
            String photo,
            String caption,
            long likeCount,
            boolean likedByMe) {
    }

    public record GroupDetail(GroupSummary group, List<MemberView> members, List<PostView> posts) {
    }

    /** One member on the group leaderboard. Points = photos x 10 + likes received x 2. */
    public record LeaderboardRow(UserLite user, int rank, int points, int photos, long likes, int streak) {
    }

    public record LikeResult(boolean liked, long likeCount) {
    }
}
