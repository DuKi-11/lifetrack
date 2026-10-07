package com.lifetrack.community;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "group_member",
        uniqueConstraints = @UniqueConstraint(columnNames = {"group_id", "user_id"}),
        indexes = @Index(name = "idx_group_member_user", columnList = "user_id"))
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "invited_by")
    private Long invitedBy;

    /** The member's local day they joined. Days before this don't count against the group streak. */
    @Column(name = "joined_day")
    private LocalDate joinedDay;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    protected GroupMember() {
    }

    public static GroupMember active(Long groupId, Long userId, LocalDate joinedDay) {
        GroupMember m = new GroupMember();
        m.groupId = groupId;
        m.userId = userId;
        m.status = Status.ACTIVE;
        m.joinedDay = joinedDay;
        return m;
    }

    public static GroupMember invited(Long groupId, Long userId, Long invitedBy) {
        GroupMember m = new GroupMember();
        m.groupId = groupId;
        m.userId = userId;
        m.status = Status.INVITED;
        m.invitedBy = invitedBy;
        return m;
    }

    public Long getId() { return id; }
    public Long getGroupId() { return groupId; }
    public Long getUserId() { return userId; }
    public Status getStatus() { return status; }
    public Long getInvitedBy() { return invitedBy; }
    public LocalDate getJoinedDay() { return joinedDay; }

    public void accept(LocalDate day) {
        this.status = Status.ACTIVE;
        this.joinedDay = day;
    }

    public enum Status { INVITED, ACTIVE }
}
