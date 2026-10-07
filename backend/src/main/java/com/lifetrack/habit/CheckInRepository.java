package com.lifetrack.habit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    List<CheckIn> findByUserIdAndDateBetween(Long userId, LocalDate from, LocalDate to);

    Optional<CheckIn> findByHabitIdAndDate(Long habitId, LocalDate date);

    long countByUserId(Long userId);

    @Query("select distinct c.date from CheckIn c where c.userId = :userId order by c.date")
    List<LocalDate> findDistinctDatesByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("delete from CheckIn c where c.habitId = :habitId")
    void deleteByHabitId(@Param("habitId") Long habitId);
}
