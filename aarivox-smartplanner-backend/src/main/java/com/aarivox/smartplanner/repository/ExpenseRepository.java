package com.aarivox.smartplanner.repository;

import com.aarivox.smartplanner.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, String> {
    List<Expense> findByUser_IdOrderByDateDesc(String userId);
}
