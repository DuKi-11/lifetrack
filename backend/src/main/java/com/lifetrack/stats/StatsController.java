package com.lifetrack.stats;

import com.lifetrack.stats.StatsService.HeatmapDay;
import com.lifetrack.stats.StatsService.Summary;
import com.lifetrack.stats.StatsService.WeeklyStats;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /** The 7 days ending on ?date, plus the completion rate of the week before. */
    @GetMapping("/weekly")
    public WeeklyStats weekly(@AuthenticationPrincipal Long userId,
                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return statsService.weekly(userId, date);
    }

    /** Streaks and totals for the profile page. */
    @GetMapping("/summary")
    public Summary summary(@AuthenticationPrincipal Long userId,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return statsService.summary(userId, date);
    }

    /** Check-ins per day for the activity heatmap. */
    @GetMapping("/heatmap")
    public List<HeatmapDay> heatmap(@AuthenticationPrincipal Long userId,
                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                    @RequestParam(defaultValue = "26") int weeks) {
        return statsService.heatmap(userId, date, weeks);
    }
}
