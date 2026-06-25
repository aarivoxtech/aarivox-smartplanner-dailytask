import { Injectable, signal, computed, inject } from '@angular/core';
import { Task } from '../models/task.model';
import { firstValueFrom } from 'rxjs';
import { AlarmService } from './alarm.service';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiService = inject(ApiService);
  private alarmService = inject(AlarmService);
  private notificationService = inject(NotificationService);
  
  private tasksSignal = signal<Task[]>([]);
  private checkedReminders = new Set<string>();
  
  // Public Signals
  tasks = computed(() => this.tasksSignal());
  
  // Analytics Signals
  pendingTasksCount = computed(() => this.tasksSignal().filter(t => t.status === 'pending').length);
  inProgressTasksCount = computed(() => this.tasksSignal().filter(t => t.status === 'in-progress').length);
  completedTasksCount = computed(() => this.tasksSignal().filter(t => t.status === 'completed').length);
  totalTasksCount = computed(() => this.tasksSignal().length);
  
  // Upcoming reminders count (tasks with reminders scheduled for today that are not completed)
  upcomingRemindersCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.tasksSignal().filter(t => t.status !== 'completed' && t.reminderDate === today).length;
  });

  constructor() {
    this.loadTasks();
    this.syncTasksWithBackend();
    this.startReminderChecking();
  }

  private startReminderChecking() {
    // Run checks every 10 seconds locally to ensure prompt alarms in web/browser
    setInterval(() => {
      this.checkLocalReminders();
    }, 10000);
  }

  private checkLocalReminders() {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const nowTimeStr = `${hrs}:${mins}`;
    
    // Filter active pending/in-progress tasks matching date and time
    const matchingTasks = this.tasksSignal().filter(task => 
      task.status !== 'completed' && 
      task.reminderDate === today && 
      task.reminderTime === nowTimeStr &&
      !this.checkedReminders.has(task.id)
    );

    for (const task of matchingTasks) {
      console.log('LOCAL ALARM TRIGGERED: ' + task.title + ' at ' + nowTimeStr);
      this.checkedReminders.add(task.id);

      this.notificationService.addNotification(
        '⏰ Task Alert: ' + task.title,
        task.description || 'Upcoming task reminder is due now.',
        'high'
      );

      this.alarmService.startAlarm();
    }
  }

  private loadTasks() {
    const savedTasks = localStorage.getItem('aarivox_tasks');
    if (savedTasks) {
      this.tasksSignal.set(JSON.parse(savedTasks));
    } else {
      // Setup default mock tasks
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];

      const initialTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Review Quarterly Budget Plan',
          description: 'Analyze budget sheets and optimize marketing allocations.',
          priority: 'high',
          dueDate: today,
          reminderDate: today,
          reminderTime: '14:30',
          status: 'in-progress',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-2',
          title: 'Finalize Mobile Design Mockups',
          description: 'Review Aarivox Smart Planner UI with product team.',
          priority: 'high',
          dueDate: today,
          reminderDate: today,
          reminderTime: '10:00',
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-3',
          title: 'Weekly Standup with Development Team',
          description: 'Sync on Ionic 8 updates and Spring Boot backend readiness.',
          priority: 'medium',
          dueDate: tomorrow,
          reminderDate: tomorrow,
          reminderTime: '09:00',
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-4',
          title: 'Update Expense Analytics Module',
          description: 'Build category analytics component with signals integration.',
          priority: 'medium',
          dueDate: nextWeek,
          reminderDate: nextWeek,
          reminderTime: '16:00',
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-5',
          title: 'Review Personal Insurance Renewal',
          description: 'Compare rates and complete renewal process.',
          priority: 'low',
          dueDate: tomorrow,
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      ];

      this.tasksSignal.set(initialTasks);
      this.saveToStorage(initialTasks);
    }
  }

  private saveToStorage(tasks: Task[]) {
    localStorage.setItem('aarivox_tasks', JSON.stringify(tasks));
  }

  /**
   * Sync task data with PostgreSQL database via REST API using ApiService
   */
  async syncTasksWithBackend() {
    const token = localStorage.getItem('aarivox_auth_token') || sessionStorage.getItem('aarivox_auth_token');
    if (!token) return;

    try {
      // Add custom header to skip showing global loading spinner for silent background syncing
      const liveTasks = await firstValueFrom(
        this.apiService.get<Task[]>('tasks')
      );
      if (liveTasks) {
        // Map any null status/descriptions to default strings
        const cleanedTasks = liveTasks.map(t => ({
          ...t,
          status: t.status || 'pending',
          description: t.description || ''
        }));
        this.tasksSignal.set(cleanedTasks);
        this.saveToStorage(cleanedTasks);
        console.log('Tasks synced from Spring Boot backend.');
      }
    } catch (e) {
      console.warn('Backend server unreachable. Using task cache.', e);
    }
  }

  addTask(task: Omit<Task, 'id' | 'createdAt'>): Task {
    const newTask: Task = {
      ...task,
      id: 'task-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };

    // 1. Optimistic UI update
    const currentTasks = [...this.tasksSignal(), newTask];
    this.tasksSignal.set(currentTasks);
    this.saveToStorage(currentTasks);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.post('tasks', newTask).subscribe({
      next: () => console.log('Task synchronized to backend database.'),
      error: (err) => console.warn('Could not sync added task to backend (running in offline mode):', err)
    });

    return newTask;
  }

  updateTask(updatedTask: Task) {
    // 1. Optimistic UI update
    const currentTasks = this.tasksSignal().map(task => 
      task.id === updatedTask.id ? updatedTask : task
    );
    this.tasksSignal.set(currentTasks);
    this.saveToStorage(currentTasks);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.put(`tasks/${updatedTask.id}`, updatedTask).subscribe({
      next: () => console.log('Task update synchronized to backend database.'),
      error: (err) => console.warn('Could not sync updated task to backend (running in offline mode):', err)
    });
  }

  deleteTask(id: string) {
    // 1. Optimistic UI update
    const currentTasks = this.tasksSignal().filter(task => task.id !== id);
    this.tasksSignal.set(currentTasks);
    this.saveToStorage(currentTasks);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.delete(`tasks/${id}`).subscribe({
      next: () => console.log('Task deletion synchronized to backend database.'),
      error: (err) => console.warn('Could not sync deleted task to backend (running in offline mode):', err)
    });
  }
}
