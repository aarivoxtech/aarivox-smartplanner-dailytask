package com.aarivox.smartplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private String id;
    private String title;
    private String description;
    private String priority; // HIGH, MEDIUM, LOW
    private LocalDate dueDate;
    private LocalDate reminderDate;
    private LocalTime reminderTime;
    private String status; // PENDING, COMPLETED
}
