import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { TaskService } from '../core/services/task.service';
import { ExpenseService } from '../core/services/expense.service';
import { IonContent, IonIcon, IonProgressBar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  documentTextOutline, 
  downloadOutline, 
  analyticsOutline, 
  pieChartOutline, 
  cashOutline, 
  checkboxOutline, 
  alarmOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonProgressBar
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  private http = inject(HttpClient);
  private taskService = inject(TaskService);
  private expenseService = inject(ExpenseService);
  private destroyRef = inject(DestroyRef);

  // Fallback Local Signals if backend is offline
  totalTasks = computed(() => this.taskService.totalTasksCount());
  completedTasks = computed(() => this.taskService.completedTasksCount());
  pendingTasks = computed(() => this.taskService.pendingTasksCount());
  totalExpenses = computed(() => this.expenseService.totalExpenses());
  expensesByCategory = computed(() => this.expenseService.categorySummary());

  // Backend sync states
  syncing = signal(false);
  backendStats = signal<any>(null);

  constructor() {
    addIcons({
      documentTextOutline,
      downloadOutline,
      analyticsOutline,
      pieChartOutline,
      cashOutline,
      checkboxOutline
    });
  }

  ngOnInit() {
    this.fetchReportsSummary();
  }

  async fetchReportsSummary() {
    const token = localStorage.getItem('aarivox_auth_token') || sessionStorage.getItem('aarivox_auth_token');
    if (!token) return;

    this.syncing.set(true);
    try {
      this.http.get<any>(`${environment.apiUrl}/reports/summary`).pipe(
        takeUntilDestroyed(this.destroyRef) // auto cleanup subscription
      ).subscribe({
        next: (data) => {
          this.backendStats.set(data);
          this.syncing.set(false);
        },
        error: (err) => {
          console.warn('Reports backend unreachable. Displaying client-cached dashboard data.', err);
          this.syncing.set(false);
        }
      });
    } catch (e) {
      this.syncing.set(false);
    }
  }

  exportReport(format: 'pdf' | 'excel') {
    const token = localStorage.getItem('aarivox_auth_token') || sessionStorage.getItem('aarivox_auth_token');
    if (!token) {
      alert('You must be logged in to download reports.');
      return;
    }

    const endpoint = `${environment.apiUrl}/reports/export/${format}`;
    this.http.get(endpoint, { responseType: 'blob' }).pipe(
      takeUntilDestroyed(this.destroyRef) // auto cleanup subscription
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Aarivox_Smart_Planner_Report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        alert('Failed to generate report from backend. Running in offline/bypass mode. Export functionality requires a live Spring Boot server.');
        console.error(err);
      }
    });
  }
}
