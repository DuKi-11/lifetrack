package com.lifetrack.mood;

import jakarta.persistence.*;

import java.time.LocalDate;

/** How the user felt on one day: a score from 1 (bad) to 5 (great) and an optional short note. */
@Entity
@Table(name = "mood_entry",
        uniqueConstraints = @UniqueConstraint(name = "uk_mood_user_day", columnNames = {"user_id", "entry_date"}))
public class MoodEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private int score;

    @Column(length = 280)
    private String note;

    protected MoodEntry() {
    }

    public MoodEntry(Long userId, LocalDate date) {
        this.userId = userId;
        this.date = date;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public LocalDate getDate() { return date; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
