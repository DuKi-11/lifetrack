package com.lifetrack.community;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

/** A member's photo for one day in one group. Posting again the same day replaces it. */
@Entity
@Table(name = "group_post",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "user_id", "post_day"}),
        indexes = @Index(name = "idx_group_post_group", columnList = "group_id"))
public class GroupPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "post_day", nullable = false)
    private LocalDate postDay;

    // Shrunk by the frontend and stored as a data URL, like profile pictures
    @Column(nullable = false, columnDefinition = "TEXT")
    private String photo;

    @Column(length = 200)
    private String caption;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected GroupPost() {
    }

    public GroupPost(Long groupId, Long userId, LocalDate postDay, String photo, String caption) {
        this.groupId = groupId;
        this.userId = userId;
        this.postDay = postDay;
        this.photo = photo;
        this.caption = caption;
    }

    public Long getId() { return id; }
    public Long getGroupId() { return groupId; }
    public Long getUserId() { return userId; }
    public LocalDate getPostDay() { return postDay; }
    public String getPhoto() { return photo; }
    public String getCaption() { return caption; }
    public Instant getCreatedAt() { return createdAt; }

    public void replace(String photo, String caption) {
        this.photo = photo;
        this.caption = caption;
        this.createdAt = Instant.now();
    }
}
