package com.lifetrack.habit;

import com.lifetrack.habit.HabitDtos.HabitRequest;
import com.lifetrack.habit.HabitDtos.HabitView;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Every endpoint takes the user's local date (?date=2026-10-05) because "today" depends on
 * the user's time zone, not the server's.
 */
@RestController
@RequestMapping("/api/habits")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping
    public List<HabitView> list(@AuthenticationPrincipal Long userId,
                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return habitService.list(userId, date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitView create(@AuthenticationPrincipal Long userId,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                            @Valid @RequestBody HabitRequest request) {
        return habitService.create(userId, request, date);
    }

    @PutMapping("/{id}")
    public HabitView update(@AuthenticationPrincipal Long userId,
                            @PathVariable Long id,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                            @Valid @RequestBody HabitRequest request) {
        return habitService.update(userId, id, request, date);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        habitService.delete(userId, id);
    }

    @PostMapping("/{id}/toggle")
    public HabitView toggle(@AuthenticationPrincipal Long userId,
                            @PathVariable Long id,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return habitService.toggle(userId, id, date);
    }
}
