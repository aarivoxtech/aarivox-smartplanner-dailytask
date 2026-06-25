package com.aarivox.smartplanner.controller;

import com.aarivox.smartplanner.dto.ExpenseDto;
import com.aarivox.smartplanner.model.Expense;
import com.aarivox.smartplanner.model.User;
import com.aarivox.smartplanner.repository.ExpenseRepository;
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
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getAllExpenses(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }
        List<ExpenseDto> expenses = expenseRepository.findByUser_IdOrderByDateDesc(currentUser.getId())
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(expenses);
    }

    @PostMapping
    public ResponseEntity<?> createExpense(@RequestBody ExpenseDto expenseDto, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<User> userOptional = userRepository.findById(currentUser.getId());
        if (!userOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User profile not found.");
        }

        Expense expense = convertToEntity(expenseDto, userOptional.get());
        if (expense.getId() == null || expense.getId().isEmpty()) {
            expense.setId(java.util.UUID.randomUUID().toString());
        }

        Expense savedExpense = expenseRepository.save(expense);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDto(savedExpense));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateExpense(@PathVariable String id, @RequestBody ExpenseDto expenseDto, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<Expense> expenseOptional = expenseRepository.findById(id);
        if (!expenseOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Expense log not found.");
        }

        Expense expense = expenseOptional.get();
        if (!expense.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to modify this expense record.");
        }

        expense.setAmount(expenseDto.getAmount());
        expense.setCategory(expenseDto.getCategory());
        expense.setDate(expenseDto.getDate());
        expense.setNotes(expenseDto.getNotes());

        Expense updatedExpense = expenseRepository.save(expense);
        return ResponseEntity.ok(convertToDto(updatedExpense));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExpense(@PathVariable String id, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        Optional<Expense> expenseOptional = expenseRepository.findById(id);
        if (!expenseOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Expense log not found.");
        }

        Expense expense = expenseOptional.get();
        if (!expense.getUser().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You do not have permission to delete this expense record.");
        }

        expenseRepository.delete(expense);
        return ResponseEntity.ok("Expense record deleted successfully.");
    }

    private ExpenseDto convertToDto(Expense expense) {
        return ExpenseDto.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .category(expense.getCategory())
                .date(expense.getDate())
                .notes(expense.getNotes())
                .build();
    }

    private Expense convertToEntity(ExpenseDto dto, User user) {
        return Expense.builder()
                .id(dto.getId())
                .user(user)
                .amount(dto.getAmount())
                .category(dto.getCategory())
                .date(dto.getDate())
                .notes(dto.getNotes())
                .build();
    }
}
