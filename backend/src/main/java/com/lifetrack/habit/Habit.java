package com.lifetrack.habit;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "habit", indexes = @Index(name = "idx_habit_user", columnList = "user_id"))
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category;

    /** Accent color as hex, e.g. #5B4CF0 */
    @Column(nullable = false, length = 7)
    private String color;

    /** Short goal text shown under the name, e.g. "10 min" or "8 cups" */
    @Column(length = 60)
    private String goal;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Habit() {
    }

    public Habit(Long userId, String name, Category category, String color, String goal) {
        this.userId = userId;
        this.name = name;
        this.category = category;
        this.color = color;
        this.goal = goal;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }
    public Instant getCreatedAt() { return createdAt; }

    public enum Category { HEALTH, STUDY, MIND, MONEY, OTHER }
}
