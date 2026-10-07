package com.lifetrack.habit;

import jakarta.persistence.*;

import java.time.LocalDate;

/** One habit marked done on one day. */
@Entity
@Table(name = "check_in",
        uniqueConstraints = @UniqueConstraint(name = "uk_checkin_habit_day", columnNames = {"habit_id", "check_date"}),
        indexes = @Index(name = "idx_checkin_user_day", columnList = "user_id, check_date"))
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "habit_id", nullable = false)
    private Long habitId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "check_date", nullable = false)
    private LocalDate date;

    protected CheckIn() {
    }

    public CheckIn(Long habitId, Long userId, LocalDate date) {
        this.habitId = habitId;
        this.userId = userId;
        this.date = date;
    }

    public Long getId() { return id; }
    public Long getHabitId() { return habitId; }
    public Long getUserId() { return userId; }
    public LocalDate getDate() { return date; }
}
