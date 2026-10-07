package com.lifetrack.community;

import com.lifetrack.community.CommunityDtos.FriendRequestBody;
import com.lifetrack.community.CommunityDtos.FriendsView;
import com.lifetrack.community.CommunityDtos.UserLite;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public FriendsView list(@AuthenticationPrincipal Long userId) {
        return friendService.list(userId);
    }

    @GetMapping("/search")
    public List<UserLite> search(@AuthenticationPrincipal Long userId, @RequestParam String q) {
        return friendService.search(userId, q);
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public void request(@AuthenticationPrincipal Long userId, @Valid @RequestBody FriendRequestBody body) {
        friendService.request(userId, body.email(), body.userId());
    }

    @PostMapping("/{friendshipId}/accept")
    public void accept(@AuthenticationPrincipal Long userId, @PathVariable Long friendshipId) {
        friendService.accept(userId, friendshipId);
    }

    @DeleteMapping("/{friendshipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal Long userId, @PathVariable Long friendshipId) {
        friendService.remove(userId, friendshipId);
    }
}
