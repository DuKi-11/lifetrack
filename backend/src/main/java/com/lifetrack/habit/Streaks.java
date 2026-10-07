package com.lifetrack.habit;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Set;
import java.util.TreeSet;

/** Streak math shared by habits and stats. */
public final class Streaks {

    private Streaks() {
    }

    /**
     * Days in a row ending today. If today isn't done yet, the streak still counts up to yesterday,
     * so it doesn't drop to 0 every morning.
     */
    public static int current(Set<LocalDate> doneDays, LocalDate today) {
        LocalDate day = doneDays.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (doneDays.contains(day)) {
            streak++;
            day = day.minusDays(1);
        }
        return streak;
    }

    /** Longest run of consecutive days ever. */
    public static int longest(Collection<LocalDate> doneDays) {
        int best = 0;
        int run = 0;
        LocalDate previous = null;
        for (LocalDate day : new TreeSet<>(doneDays)) {
            run = (previous != null && previous.plusDays(1).equals(day)) ? run + 1 : 1;
            best = Math.max(best, run);
            previous = day;
        }
        return best;
    }
}
