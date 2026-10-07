package com.lifetrack.community;

import com.lifetrack.community.CommunityDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/** Like the habit endpoints, these take the user's local date (?date=2026-10-05). */
@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @GetMapping
    public List<GroupSummary> list(@AuthenticationPrincipal Long userId,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return groupService.list(userId, date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupSummary create(@AuthenticationPrincipal Long userId,
                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                               @Valid @RequestBody GroupRequest request) {
        return groupService.create(userId, request, date);
    }

    @GetMapping("/{id}")
    public GroupDetail detail(@AuthenticationPrincipal Long userId, @PathVariable Long id,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return groupService.detail(userId, id, date);
    }

    @GetMapping("/{id}/leaderboard")
    public List<LeaderboardRow> leaderboard(@AuthenticationPrincipal Long userId, @PathVariable Long id,
                                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                            @RequestParam(defaultValue = "week") String period) {
        return groupService.leaderboard(userId, id, date, period);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        groupService.delete(userId, id);
    }

    @PostMapping("/{id}/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public void invite(@AuthenticationPrincipal Long userId, @PathVariable Long id, @Valid @RequestBody InviteRequest body) {
        groupService.invite(userId, id, body.userId());
    }

    @PostMapping("/{id}/accept")
    public void accept(@AuthenticationPrincipal Long userId, @PathVariable Long id,
                       @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        groupService.acceptInvite(userId, id, date);
    }

    @PostMapping("/{id}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        groupService.leave(userId, id);
    }

    @PostMapping("/{id}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public PostView post(@AuthenticationPrincipal Long userId, @PathVariable Long id,
                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                         @Valid @RequestBody PostRequest request) {
        return groupService.post(userId, id, request, date);
    }

    @DeleteMapping("/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(@AuthenticationPrincipal Long userId, @PathVariable Long postId) {
        groupService.deletePost(userId, postId);
    }

    @PostMapping("/posts/{postId}/like")
    public LikeResult like(@AuthenticationPrincipal Long userId, @PathVariable Long postId) {
        return groupService.toggleLike(userId, postId);
    }
}
