package com.lifetrack.reward;

import com.lifetrack.reward.RewardDtos.EquipRequest;
import com.lifetrack.reward.RewardDtos.RewardsView;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rewards")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    @GetMapping
    public RewardsView view(@AuthenticationPrincipal Long userId) {
        return rewardService.view(userId);
    }

    @PutMapping("/equip")
    public RewardsView equip(@AuthenticationPrincipal Long userId, @Valid @RequestBody EquipRequest request) {
        return rewardService.equip(userId, request);
    }
}
