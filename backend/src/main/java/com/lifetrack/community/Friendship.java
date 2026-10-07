package com.lifetrack.community;

import jakarta.persistence.*;

import java.time.Instant;

/** A friend request (PENDING) that becomes a friendship once the other person accepts (ACCEPTED). */
@Entity
@Table(name = "friendship", uniqueConstraints = @UniqueConstraint(columnNames = {"requester_id", "addressee_id"}))
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "addressee_id", nullable = false)
    private Long addresseeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected Friendship() {
    }

    public Friendship(Long requesterId, Long addresseeId) {
        this.requesterId = requesterId;
        this.addresseeId = addresseeId;
    }

    public Long getId() { return id; }
    public Long getRequesterId() { return requesterId; }
    public Long getAddresseeId() { return addresseeId; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }

    public enum Status { PENDING, ACCEPTED }
}
