package com.lifetrack.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

    List<Friendship> findByAddresseeIdAndStatus(Long addresseeId, Friendship.Status status);

    List<Friendship> findByRequesterIdAndStatus(Long requesterId, Friendship.Status status);

    @Query("select f from Friendship f where f.status = :status and (f.requesterId = :userId or f.addresseeId = :userId)")
    List<Friendship> findInvolving(@Param("userId") Long userId, @Param("status") Friendship.Status status);

    @Query("select count(f) > 0 from Friendship f where f.status = :status and "
            + "((f.requesterId = :a and f.addresseeId = :b) or (f.requesterId = :b and f.addresseeId = :a))")
    boolean existsBetween(@Param("a") Long a, @Param("b") Long b, @Param("status") Friendship.Status status);
}
