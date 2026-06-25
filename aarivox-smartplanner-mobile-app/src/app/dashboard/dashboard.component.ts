import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonIcon, 
  IonFab, 
  IonFabButton, 
  IonFabList, 
  IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  addOutline, 
  walletOutline, 
  checkboxOutline, 
  alertCircleOutline, 
  arrowForwardOutline, 
  calendarOutline, 
  trendingUpOutline,
  createOutline,
  closeOutline,
  timeOutline,
  analyticsOutline
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { TaskService } from '../core/services/task.service';
import { ExpenseService } from '../core/services/expense.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    RouterLink,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonFab,
    IonFabButton,
    IonFabList,
    IonProgressBar
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private taskService = inject(TaskService);
  private expenseService = inject(ExpenseService);
  private router = inject(Router);

  // Signals
  currentUser = this.authService.currentUser;
  
  // Task Statistics
  pendingTasks = this.taskService.pendingTasksCount;
  completedTasks = this.taskService.completedTasksCount;
  totalTasks = this.taskService.totalTasksCount;
  upcomingReminders = this.taskService.upcomingRemindersCount;

  // Expense Statistics
  totalExpenses = this.expenseService.totalExpenses;
  todayExpenses = this.expenseService.todayExpenses;
  recentExpenses = this.expenseService.recentExpenses;
  categorySummaries = this.expenseService.categorySummary;

  // Computed Productivity
  productivityPercentage = computed(() => {
    const total = this.totalTasks();
    if (total === 0) return 100;
    const completed = this.completedTasks();
    return Math.round((completed / total) * 100);
  });

  // FAB active state
  isFabOpen = signal(false);

  constructor() {
    addIcons({
      addOutline,
      walletOutline,
      checkboxOutline,
      alertCircleOutline,
      arrowForwardOutline,
      calendarOutline,
      trendingUpOutline,
      createOutline,
      closeOutline,
      timeOutline,
      analyticsOutline
    });
  }

  quickAdd(type: 'task' | 'expense') {
    if (type === 'task') {
      this.router.navigate(['/app/tasks'], { queryParams: { openAdd: 'true' } });
    } else {
      this.router.navigate(['/app/expenses'], { queryParams: { openAdd: 'true' } });
    }
  }
}
