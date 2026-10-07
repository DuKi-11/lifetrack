package com.lifetrack.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GroupPostRepository extends JpaRepository<GroupPost, Long> {

    long countByUserId(Long userId);

    Optional<GroupPost> findByGroupIdAndUserIdAndPostDay(Long groupId, Long userId, LocalDate postDay);

    List<GroupPost> findTop30ByGroupIdOrderByPostDayDescCreatedAtDesc(Long groupId);

    /** Just who posted on which day (no photos), for streak math. Rows are [userId, postDay]. */
    @Query("select p.userId, p.postDay from GroupPost p where p.groupId = :groupId and p.postDay >= :from")
    List<Object[]> findPostDays(@Param("groupId") Long groupId, @Param("from") LocalDate from);

    @Modifying
    @Query("delete from GroupPost p where p.groupId = :groupId")
    void deleteByGroupId(@Param("groupId") Long groupId);
}
