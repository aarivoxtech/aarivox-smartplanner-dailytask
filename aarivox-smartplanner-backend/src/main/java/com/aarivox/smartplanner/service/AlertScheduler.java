package com.aarivox.smartplanner.service;

import com.aarivox.smartplanner.model.Task;
import com.aarivox.smartplanner.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class AlertScheduler {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private FirebaseService firebaseService;

    // Runs every minute
    @Scheduled(cron = "0 * * * * *")
    public void checkAndSendReminders() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        LocalTime nextMinute = now.plusMinutes(1);

        System.out.println("AlertScheduler: Checking task reminders for " + today + " between " + now + " and " + nextMinute);

        try {
            List<Task> pendingTasks = taskRepository.findByStatusAndReminderDateAndReminderTimeBetween(
                    "PENDING",
                    today,
                    now,
                    nextMinute
            );

            if (!pendingTasks.isEmpty()) {
                System.out.println("AlertScheduler: Found " + pendingTasks.size() + " task(s) to notify.");
                for (Task task : pendingTasks) {
                    if (task.getUser() != null && task.getUser().getFcmToken() != null && !task.getUser().getFcmToken().isEmpty()) {
                        String token = task.getUser().getFcmToken();
                        String title = "⏰ Aarivox Smart Planner Reminder";
                        String body = "Don't forget task: " + task.getTitle() + 
                                      (task.getDescription() != null ? " - " + task.getDescription() : "");
                        
                        firebaseService.sendPushNotification(token, title, body);
                    } else {
                        System.out.println("AlertScheduler: Task '" + task.getTitle() + "' has active reminder, but user profile has no registered FCM token.");
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("AlertScheduler: Error running task reminder scheduler: " + e.getMessage());
        }
    }
}
