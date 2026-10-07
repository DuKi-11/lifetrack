package com.lifetrack.reward;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public final class RewardDtos {

    private RewardDtos() {
    }

    public record RewardItem(String id, String name, int points, boolean unlocked) {
    }

    /** kind THEME or CROWN. id is a reward id, or null/"NONE" to take the crown off. */
    public record EquipRequest(@NotNull(message = "Choose a reward") RewardCatalog.Kind kind, String id) {
    }

    /**
     * @param points   total community points (10 per photo, 2 per like from others), never going down
     * @param next     the closest reward still locked, or null when everything is unlocked
     */
    public record RewardsView(
            int points,
            String equippedTheme,
            String equippedCrown,
            List<RewardItem> themes,
            List<RewardItem> crowns,
            RewardItem next) {
    }
}
