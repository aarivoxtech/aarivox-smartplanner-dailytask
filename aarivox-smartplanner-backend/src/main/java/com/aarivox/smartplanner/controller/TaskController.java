package com.aarivox.smartplanner.controller;

import com.aarivox.smartplanner.dto.TaskDto;
import com.aarivox.smartplanner.model.Task;
import com.aarivox.smartplanner.model.User;
import com.aarivox.smartplanner.repository.TaskRepository;
import com.aarivox.smartplanner.repository.UserRepository;
import com.aarivox.smartplanner.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllTasks(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }
        List<TaskDto> tasks = taskRepository.findByUser_IdOrderByDueDateAsc(currentUser.getId())
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(tasks);
    }

    @PostMapping
    public ResponseEntity<?> createTask(@RequestBody TaskDto taskDto, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<User> userOptional = userRepository.findById(currentUser.getId());
        if (!userOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User profile not found.");
        }

        Task task = convertToEntity(taskDto, userOptional.get());
        if (task.getId() == null || task.getId().isEmpty()) {
            task.setId(java.util.UUID.randomUUID().toString());
        }
        
        Task savedTask = taskRepository.save(task);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(savedTask));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@PathVariable String id, @RequestBody TaskDto taskDto, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<Task> taskOptional = taskRepository.findById(id);
        if (!taskOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Task not found.");
        }

        Task task = taskOptional.get();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to modify this task.");
        }

        task.setTitle(taskDto.getTitle());
        task.setDescription(taskDto.getDescription());
        task.setPriority(taskDto.getPriority());
        task.setDueDate(taskDto.getDueDate());
        task.setReminderDate(taskDto.getReminderDate());
        task.setReminderTime(taskDto.getReminderTime());
        task.setStatus(taskDto.getStatus());

        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(convertToDto(updatedTask));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<Task> taskOptional = taskRepository.findById(id);
        if (!taskOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Task not found.");
        }

        Task task = taskOptional.get();
        if (!task.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to delete this task.");
        }

        taskRepository.delete(task);
        return ResponseEntity.ok("Task deleted successfully.");
    }

    private TaskDto convertToDto(Task task) {
        return TaskDto.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .priority(task.getPriority())
                .dueDate(task.getDueDate())
                .reminderDate(task.getReminderDate())
                .reminderTime(task.getReminderTime())
                .status(task.getStatus())
                .build();
    }

    private Task convertToEntity(TaskDto dto, User user) {
        return Task.builder()
                .id(dto.getId())
                .user(user)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(dto.getPriority())
                .dueDate(dto.getDueDate())
                .reminderDate(dto.getReminderDate())
                .reminderTime(dto.getReminderTime())
                .status(dto.getStatus())
                .build();
    }
}
