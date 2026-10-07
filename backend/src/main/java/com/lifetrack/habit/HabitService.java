package com.lifetrack.habit;

import com.lifetrack.common.ApiException;
import com.lifetrack.habit.HabitDtos.HabitRequest;
import com.lifetrack.habit.HabitDtos.HabitView;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HabitService {

    /** How far back to look when computing streaks. */
    private static final int STREAK_WINDOW_DAYS = 400;

    private final HabitRepository habits;
    private final CheckInRepository checkIns;

    public HabitService(HabitRepository habits, CheckInRepository checkIns) {
        this.habits = habits;
        this.checkIns = checkIns;
    }

    @Transactional(readOnly = true)
    public List<HabitView> list(Long userId, LocalDate day) {
        List<Habit> all = habits.findByUserIdOrderByCreatedAtAsc(userId);
        Map<Long, Set<LocalDate>> doneByHabit = loadDoneDays(userId, day);
        return all.stream().map(h -> toView(h, doneByHabit.getOrDefault(h.getId(), Set.of()), day)).toList();
    }

    @Transactional
    public HabitView create(Long userId, HabitRequest req, LocalDate day) {
        Habit habit = habits.save(new Habit(userId, req.name().trim(), req.category(),
                req.color().toUpperCase(Locale.ROOT), blankToNull(req.goal())));
        return toView(habit, Set.of(), day);
    }

    @Transactional
    public HabitView update(Long userId, Long habitId, HabitRequest req, LocalDate day) {
        Habit habit = owned(userId, habitId);
        habit.setName(req.name().trim());
        habit.setCategory(req.category());
        habit.setColor(req.color().toUpperCase(Locale.ROOT));
        habit.setGoal(blankToNull(req.goal()));
        return toView(habit, loadDoneDays(userId, day).getOrDefault(habitId, Set.of()), day);
    }

    @Transactional
    public void delete(Long userId, Long habitId) {
        Habit habit = owned(userId, habitId);
        checkIns.deleteByHabitId(habit.getId());
        habits.delete(habit);
    }

    /** Marks the habit done on that day, or un-marks it if it was already done. */
    @Transactional
    public HabitView toggle(Long userId, Long habitId, LocalDate day) {
        Habit habit = owned(userId, habitId);
        // Allow one day of slack so users ahead of the server's time zone (like Japan) can check off "today"
        if (day.isAfter(LocalDate.now().plusDays(1))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can't check off a future day");
        }
        checkIns.findByHabitIdAndDate(habitId, day).ifPresentOrElse(
                checkIns::delete,
                () -> checkIns.save(new CheckIn(habitId, userId, day)));
        checkIns.flush();
        return toView(habit, loadDoneDays(userId, day).getOrDefault(habitId, Set.of()), day);
    }

    private Habit owned(Long userId, Long habitId) {
        return habits.findByIdAndUserId(habitId, userId).orElseThrow(() -> ApiException.notFound("Habit"));
    }

    private Map<Long, Set<LocalDate>> loadDoneDays(Long userId, LocalDate day) {
        return checkIns.findByUserIdAndDateBetween(userId, day.minusDays(STREAK_WINDOW_DAYS), day).stream()
                .collect(Collectors.groupingBy(CheckIn::getHabitId,
                        Collectors.mapping(CheckIn::getDate, Collectors.toSet())));
    }

    private static HabitView toView(Habit h, Set<LocalDate> done, LocalDate day) {
        List<Boolean> last7 = new ArrayList<>(7);
        for (int i = 6; i >= 0; i--) {
            last7.add(done.contains(day.minusDays(i)));
        }
        return new HabitView(h.getId(), h.getName(), h.getCategory(), h.getColor(), h.getGoal(),
                done.contains(day), last7, Streaks.current(done, day));
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
