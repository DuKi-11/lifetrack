package com.lifetrack.habit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class HabitDtos {

    private HabitDtos() {
    }

    public record HabitRequest(
            @NotBlank(message = "Please give the habit a name")
            @Size(max = 60, message = "Name is too long")
            String name,

            @NotNull(message = "Please choose a category")
            Habit.Category category,

            @NotBlank
            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must look like #5B4CF0")
            String color,

            @Size(max = 60, message = "Goal is too long")
            String goal) {
    }

    /**
     * A habit as the app shows it on a given day.
     *
     * @param last7     done/not done for the 7 days ending on that day (oldest first)
     * @param streak    days in a row this habit has been done
     */
    public record HabitView(
            Long id,
            String name,
            Habit.Category category,
            String color,
            String goal,
            boolean doneToday,
            List<Boolean> last7,
            int streak) {
    }
}
