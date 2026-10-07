package com.lifetrack.mood;

import com.lifetrack.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/mood")
public class MoodController {

    private final MoodRepository moods;

    public MoodController(MoodRepository moods) {
        this.moods = moods;
    }

    public record MoodRequest(
            @NotNull(message = "Please pick a date") LocalDate date,
            @NotNull(message = "Please pick a mood")
            @Min(value = 1, message = "Mood must be 1 to 5")
            @Max(value = 5, message = "Mood must be 1 to 5") Integer score,
            @Size(max = 280, message = "Note can be up to 280 characters") String note) {
    }

    public record MoodDto(LocalDate date, int score, String note) {
        static MoodDto from(MoodEntry e) {
            return new MoodDto(e.getDate(), e.getScore(), e.getNote());
        }
    }

    /** Mood entries between two dates (inclusive), oldest first. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<MoodDto> list(@AuthenticationPrincipal Long userId,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        if (from.isAfter(to) || from.plusDays(400).isBefore(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a range of up to 400 days");
        }
        return moods.findByUserIdAndDateBetweenOrderByDateAsc(userId, from, to).stream().map(MoodDto::from).toList();
    }

    /** Creates or replaces the mood for that day. */
    @PutMapping
    @Transactional
    public MoodDto save(@AuthenticationPrincipal Long userId, @Valid @RequestBody MoodRequest req) {
        MoodEntry entry = moods.findByUserIdAndDate(userId, req.date())
                .orElseGet(() -> new MoodEntry(userId, req.date()));
        entry.setScore(req.score());
        entry.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        return MoodDto.from(moods.save(entry));
    }
}
