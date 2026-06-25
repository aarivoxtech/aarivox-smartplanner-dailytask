package com.aarivox.smartplanner.repository;

import com.aarivox.smartplanner.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByUser_IdOrderByDueDateAsc(String userId);
    
    List<Task> findByStatusAndReminderDateAndReminderTimeBetween(
        String status, 
        LocalDate reminderDate, 
        LocalTime start, 
        LocalTime end
    );
}
