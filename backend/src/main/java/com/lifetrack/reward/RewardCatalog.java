package com.lifetrack.reward;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/** Everything points can unlock. The app has the pictures (colors, crown art) for each id. */
public final class RewardCatalog {

    public static final int POINTS_PER_PHOTO = 10;
    public static final int POINTS_PER_LIKE = 2;

    private RewardCatalog() {
    }

    public enum Kind { THEME, CROWN }

    public record Reward(String id, Kind kind, String name, int points) {
    }

    public static final List<Reward> THEMES = List.of(
            new Reward("VIOLET", Kind.THEME, "Violet", 0),
            new Reward("OCEAN", Kind.THEME, "Ocean", 50),
            new Reward("FOREST", Kind.THEME, "Forest", 120),
            new Reward("SUNSET", Kind.THEME, "Sunset", 250),
            new Reward("ROSE", Kind.THEME, "Rose", 400),
            new Reward("AURORA", Kind.THEME, "Aurora", 800));

    public static final List<Reward> CROWNS = List.of(
            new Reward("BRONZE", Kind.CROWN, "Bronze crown", 100),
            new Reward("SILVER", Kind.CROWN, "Silver crown", 300),
            new Reward("GOLD", Kind.CROWN, "Gold crown", 600),
            new Reward("DIAMOND", Kind.CROWN, "Diamond crown", 1000),
            new Reward("ROYAL", Kind.CROWN, "Royal crown", 2000));

    public static Optional<Reward> find(Kind kind, String id) {
        return Stream.concat(THEMES.stream(), CROWNS.stream())
                .filter(r -> r.kind() == kind && r.id().equals(id))
                .findFirst();
    }
}
