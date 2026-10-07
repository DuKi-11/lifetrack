package com.lifetrack.habit;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByUserIdOrderByCreatedAtAsc(Long userId);

    Optional<Habit> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);
}
