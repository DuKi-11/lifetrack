package com.lifetrack.community;

import jakarta.persistence.*;

import java.time.Instant;

/** A shared goal that friends work on together, e.g. "Run 3 times a week". */
@Entity
@Table(name = "goal_group")
public class GoalGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String name;

    /** What members should post a photo of every day, e.g. "Photo of your workout". */
    @Column(length = 200)
    private String goal;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected GoalGroup() {
    }

    public GoalGroup(String name, String goal, Long ownerId) {
        this.name = name;
        this.goal = goal;
        this.ownerId = ownerId;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getGoal() { return goal; }
    public Long getOwnerId() { return ownerId; }
    public Instant getCreatedAt() { return createdAt; }
}
