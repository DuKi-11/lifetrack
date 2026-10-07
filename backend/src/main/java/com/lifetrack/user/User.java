package com.lifetrack.user;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    // Small profile picture stored as a data URL (the frontend shrinks it before upload)
    @Column(columnDefinition = "TEXT")
    private String avatar;

    // Rewards: which color theme and crown the user shows (null = default theme / no crown)
    @Column(length = 20)
    private String equippedTheme;

    @Column(length = 20)
    private String equippedCrown;

    // The most community points the user ever had, so unlocked rewards stay unlocked
    private Integer pointsHighWater;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected User() {
    }

    public User(String name, String email, String passwordHash) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Instant getCreatedAt() { return createdAt; }
    public String getEquippedTheme() { return equippedTheme; }
    public void setEquippedTheme(String equippedTheme) { this.equippedTheme = equippedTheme; }
    public String getEquippedCrown() { return equippedCrown; }
    public void setEquippedCrown(String equippedCrown) { this.equippedCrown = equippedCrown; }
    public int getPointsHighWater() { return pointsHighWater == null ? 0 : pointsHighWater; }

    /** Remembers a new high score. Points never go down, so rewards are never taken away. */
    public void raisePoints(int points) {
        if (points > getPointsHighWater()) pointsHighWater = points;
    }
}
