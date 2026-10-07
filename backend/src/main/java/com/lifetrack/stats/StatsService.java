package com.lifetrack.stats;

import com.lifetrack.common.ApiException;
import com.lifetrack.habit.CheckIn;
import com.lifetrack.habit.CheckInRepository;
import com.lifetrack.habit.HabitRepository;
import com.lifetrack.habit.Streaks;
import com.lifetrack.mood.MoodEntry;
import com.lifetrack.mood.MoodRepository;
import com.lifetrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StatsService {

    private final HabitRepository habits;
    private final CheckInRepository checkIns;
    private final MoodRepository moods;
    private final UserRepository users;

    public StatsService(HabitRepository habits, CheckInRepository checkIns, MoodRepository moods, UserRepository users) {
        this.habits = habits;
        this.checkIns = checkIns;
        this.moods = moods;
        this.users = users;
    }

    public record DayStat(LocalDate date, int completed, int total, Integer mood) {
    }

    /**
     * @param completionRate percent of habits done across the 7 days (0-100)
     * @param previousRate   the same for the 7 days before, to show "up 12% vs last week"
     */
    public record WeeklyStats(List<DayStat> days, int completionRate, int previousRate,
                              Double averageMood, int checkIns) {
    }

    public record Summary(int currentStreak, int longestStreak, long activeHabits,
                          long totalCheckIns, Instant memberSince) {
    }

    public record HeatmapDay(LocalDate date, int count) {
    }

    public WeeklyStats weekly(Long userId, LocalDate end) {
        int habitCount = (int) habits.countByUserId(userId);
        LocalDate start = end.minusDays(6);
        LocalDate prevStart = end.minusDays(13);

        Map<LocalDate, Long> perDay = countPerDay(userId, prevStart, end);
        Map<LocalDate, Integer> moodByDay = moods.findByUserIdAndDateBetweenOrderByDateAsc(userId, start, end).stream()
                .collect(Collectors.toMap(MoodEntry::getDate, MoodEntry::getScore));

        List<DayStat> days = new ArrayList<>();
        int weekDone = 0;
        int prevDone = 0;
        for (int i = 13; i >= 0; i--) {
            LocalDate d = end.minusDays(i);
            int done = perDay.getOrDefault(d, 0L).intValue();
            if (d.isBefore(start)) {
                prevDone += done;
            } else {
                weekDone += done;
                days.add(new DayStat(d, done, habitCount, moodByDay.get(d)));
            }
        }
        Double avgMood = moodByDay.isEmpty() ? null
                : Math.round(moodByDay.values().stream().mapToInt(Integer::intValue).average().orElse(0) * 10) / 10.0;
        return new WeeklyStats(days, percent(weekDone, habitCount * 7), percent(prevDone, habitCount * 7),
                avgMood, weekDone);
    }

    public Summary summary(Long userId, LocalDate today) {
        List<LocalDate> doneDays = checkIns.findDistinctDatesByUserId(userId);
        Instant memberSince = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in"))
                .getCreatedAt();
        return new Summary(
                Streaks.current(new HashSet<>(doneDays), today),
                Streaks.longest(doneDays),
                habits.countByUserId(userId),
                checkIns.countByUserId(userId),
                memberSince);
    }

    public List<HeatmapDay> heatmap(Long userId, LocalDate end, int weeks) {
        if (weeks < 1 || weeks > 53) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "weeks must be between 1 and 53");
        }
        LocalDate start = end.minusDays(weeks * 7L - 1);
        Map<LocalDate, Long> perDay = countPerDay(userId, start, end);
        List<HeatmapDay> result = new ArrayList<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            result.add(new HeatmapDay(d, perDay.getOrDefault(d, 0L).intValue()));
        }
        return result;
    }

    private Map<LocalDate, Long> countPerDay(Long userId, LocalDate from, LocalDate to) {
        return checkIns.findByUserIdAndDateBetween(userId, from, to).stream()
                .collect(Collectors.groupingBy(CheckIn::getDate, Collectors.counting()));
    }

    private static int percent(int part, int whole) {
        return whole == 0 ? 0 : (int) Math.round(100.0 * part / whole);
    }
}
