package com.aarivox.smartplanner.controller;

import com.aarivox.smartplanner.model.Task;
import com.aarivox.smartplanner.model.Expense;
import com.aarivox.smartplanner.repository.TaskRepository;
import com.aarivox.smartplanner.repository.ExpenseRepository;
import com.aarivox.smartplanner.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// OpenPDF imports
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

// Apache POI imports
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @GetMapping("/summary")
    public ResponseEntity<?> getSummaryReport(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        String userId = currentUser.getId();
        List<Task> tasks = taskRepository.findByUser_IdOrderByDueDateAsc(userId);
        List<Expense> expenses = expenseRepository.findByUser_IdOrderByDateDesc(userId);

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus())).count();
        long pendingTasks = tasks.stream().filter(t -> "PENDING".equalsIgnoreCase(t.getStatus())).count();
        long inProgressTasks = tasks.stream().filter(t -> "IN_PROGRESS".equalsIgnoreCase(t.getStatus()) || "IN-PROGRESS".equalsIgnoreCase(t.getStatus())).count();

        double totalExpensesAmount = expenses.stream().mapToDouble(e -> e.getAmount().doubleValue()).sum();

        Map<String, Double> expensesByCategory = new HashMap<>();
        for (Expense expense : expenses) {
            expensesByCategory.put(expense.getCategory(), expensesByCategory.getOrDefault(expense.getCategory(), 0.0) + expense.getAmount().doubleValue());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("totalTasks", totalTasks);
        response.put("completedTasks", completedTasks);
        response.put("pendingTasks", pendingTasks);
        response.put("inProgressTasks", inProgressTasks);
        response.put("totalExpenses", totalExpensesAmount);
        response.put("expensesByCategory", expensesByCategory);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = currentUser.getId();
        List<Task> tasks = taskRepository.findByUser_IdOrderByDueDateAsc(userId);
        List<Expense> expenses = expenseRepository.findByUser_IdOrderByDateDesc(userId);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Set up fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(0, 82, 204));
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(51, 65, 85));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            // Document Title
            Paragraph title = new Paragraph("AARIVOX SMART PLANNER ENTERPRISE REPORT", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // User Info
            document.add(new Paragraph("Generated For: " + currentUser.getEmail(), normalFont));
            document.add(new Paragraph("Date: " + java.time.LocalDate.now().toString(), normalFont));
            document.add(new Paragraph("--------------------------------------------------------------------------------", normalFont));

            // Section 1: Overview Dashboard
            Paragraph summaryHeading = new Paragraph("Overview Dashboard", sectionFont);
            summaryHeading.setSpacingBefore(15);
            summaryHeading.setSpacingAfter(10);
            document.add(summaryHeading);

            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.addCell(new PdfPCell(new Phrase("Metric", boldFont)));
            summaryTable.addCell(new PdfPCell(new Phrase("Value", boldFont)));

            summaryTable.addCell(new PdfPCell(new Phrase("Total Tasks", normalFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(String.valueOf(tasks.size()), normalFont)));

            long completedTasks = tasks.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus())).count();
            summaryTable.addCell(new PdfPCell(new Phrase("Completed Tasks", normalFont)));
            summaryTable.addCell(new PdfPCell(new Phrase(String.valueOf(completedTasks), normalFont)));

            double totalExpensesAmount = expenses.stream().mapToDouble(e -> e.getAmount().doubleValue()).sum();
            summaryTable.addCell(new PdfPCell(new Phrase("Total Expenses", normalFont)));
            summaryTable.addCell(new PdfPCell(new Phrase("$" + String.format("%.2f", totalExpensesAmount), normalFont)));

            document.add(summaryTable);

            // Section 2: Tasks List
            Paragraph tasksHeading = new Paragraph("Task Management Records", sectionFont);
            tasksHeading.setSpacingBefore(20);
            tasksHeading.setSpacingAfter(10);
            document.add(tasksHeading);

            if (tasks.isEmpty()) {
                document.add(new Paragraph("No tasks logged.", normalFont));
            } else {
                PdfPTable taskTable = new PdfPTable(4);
                taskTable.setWidthPercentage(100);
                taskTable.addCell(new PdfPCell(new Phrase("Title", boldFont)));
                taskTable.addCell(new PdfPCell(new Phrase("Due Date", boldFont)));
                taskTable.addCell(new PdfPCell(new Phrase("Priority", boldFont)));
                taskTable.addCell(new PdfPCell(new Phrase("Status", boldFont)));

                for (Task t : tasks) {
                    taskTable.addCell(new PdfPCell(new Phrase(t.getTitle(), normalFont)));
                    taskTable.addCell(new PdfPCell(new Phrase(t.getDueDate().toString(), normalFont)));
                    taskTable.addCell(new PdfPCell(new Phrase(t.getPriority(), normalFont)));
                    taskTable.addCell(new PdfPCell(new Phrase(t.getStatus(), normalFont)));
                }
                document.add(taskTable);
            }

            // Section 3: Expenses List
            Paragraph expensesHeading = new Paragraph("Expense Log Records", sectionFont);
            expensesHeading.setSpacingBefore(20);
            expensesHeading.setSpacingAfter(10);
            document.add(expensesHeading);

            if (expenses.isEmpty()) {
                document.add(new Paragraph("No expenses logged.", normalFont));
            } else {
                PdfPTable expenseTable = new PdfPTable(4);
                expenseTable.setWidthPercentage(100);
                expenseTable.addCell(new PdfPCell(new Phrase("Amount", boldFont)));
                expenseTable.addCell(new PdfPCell(new Phrase("Category", boldFont)));
                expenseTable.addCell(new PdfPCell(new Phrase("Date", boldFont)));
                expenseTable.addCell(new PdfPCell(new Phrase("Notes", boldFont)));

                for (Expense e : expenses) {
                    expenseTable.addCell(new PdfPCell(new Phrase("$" + String.format("%.2f", e.getAmount()), normalFont)));
                    expenseTable.addCell(new PdfPCell(new Phrase(e.getCategory(), normalFont)));
                    expenseTable.addCell(new PdfPCell(new Phrase(e.getDate().toString(), normalFont)));
                    expenseTable.addCell(new PdfPCell(new Phrase(e.getNotes() != null ? e.getNotes() : "", normalFont)));
                }
                document.add(expenseTable);
            }

            document.close();

            byte[] pdfBytes = out.toByteArray();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "Aarivox_Smart_Planner_Report.pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportExcel(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = currentUser.getId();
        List<Task> tasks = taskRepository.findByUser_IdOrderByDueDateAsc(userId);
        List<Expense> expenses = expenseRepository.findByUser_IdOrderByDateDesc(userId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Sheet 1: Tasks
            Sheet taskSheet = workbook.createSheet("Tasks");
            Row taskHeader = taskSheet.createRow(0);
            taskHeader.createCell(0).setCellValue("Title");
            taskHeader.createCell(1).setCellValue("Description");
            taskHeader.createCell(2).setCellValue("Priority");
            taskHeader.createCell(3).setCellValue("Due Date");
            taskHeader.createCell(4).setCellValue("Status");

            int rowIdx = 1;
            for (Task t : tasks) {
                Row row = taskSheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(t.getTitle());
                row.createCell(1).setCellValue(t.getDescription() != null ? t.getDescription() : "");
                row.createCell(2).setCellValue(t.getPriority());
                row.createCell(3).setCellValue(t.getDueDate().toString());
                row.createCell(4).setCellValue(t.getStatus());
            }

            // Sheet 2: Expenses
            Sheet expenseSheet = workbook.createSheet("Expenses");
            Row expenseHeader = expenseSheet.createRow(0);
            expenseHeader.createCell(0).setCellValue("Amount");
            expenseHeader.createCell(1).setCellValue("Category");
            expenseHeader.createCell(2).setCellValue("Date");
            expenseHeader.createCell(3).setCellValue("Notes");

            rowIdx = 1;
            for (Expense e : expenses) {
                Row row = expenseSheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(e.getAmount().doubleValue());
                row.createCell(1).setCellValue(e.getCategory());
                row.createCell(2).setCellValue(e.getDate().toString());
                row.createCell(3).setCellValue(e.getNotes() != null ? e.getNotes() : "");
            }

            workbook.write(out);
            byte[] excelBytes = out.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "Aarivox_Smart_Planner_Report.xlsx");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelBytes);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
