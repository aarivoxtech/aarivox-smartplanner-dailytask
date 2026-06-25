import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonModal, 
  IonTextarea, 
  IonSelect, 
  IonSelectOption, 
  IonSegment, 
  IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  addOutline, 
  trashOutline, 
  createOutline, 
  calendarOutline, 
  alarmOutline,
  closeOutline,
  checkmarkCircleOutline,
  filterOutline
} from 'ionicons/icons';
import { TaskService } from '../core/services/task.service';
import { Task } from '../core/models/task.model';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonModal,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    EmptyStateComponent
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Core task list signal
  tasks = this.taskService.tasks;

  // Search & Filter state
  searchQuery = signal('');
  activeStatusFilter = signal<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  activePriorityFilter = signal<'all' | 'high' | 'medium' | 'low'>('all');

  // Filtered lists
  filteredTasks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.activeStatusFilter();
    const priority = this.activePriorityFilter();

    return this.tasks()
      .filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query) || 
                              task.description.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || task.status === status;
        const matchesPriority = priority === 'all' || task.priority === priority;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA;
      });
  });

  // Modal form states
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingTaskId = signal<string | null>(null);
  taskForm: FormGroup;

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', [Validators.required]],
      dueDate: [new Date().toISOString().split('T')[0], [Validators.required]],
      reminderDate: [''],
      reminderTime: [''],
      status: ['pending', [Validators.required]]
    });

    addIcons({
      searchOutline,
      addOutline,
      trashOutline,
      createOutline,
      calendarOutline,
      alarmOutline,
      closeOutline,
      checkmarkCircleOutline,
      filterOutline
    });
  }

  ngOnInit() {
    // Check if redirect query param specifies opening the modal
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef) // Prevent subscription leak on view destroy
    ).subscribe(params => {
      if (params['openAdd'] === 'true') {
        this.openAddModal();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { openAdd: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  openAddModal() {
    this.isEditing.set(false);
    this.editingTaskId.set(null);
    this.taskForm.reset({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      reminderDate: '',
      reminderTime: '',
      status: 'pending'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(task: Task) {
    this.isEditing.set(true);
    this.editingTaskId.set(task.id);
    this.taskForm.patchValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      reminderDate: task.reminderDate || '',
      reminderTime: task.reminderTime || '',
      status: task.status
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  onStatusFilterChange(event: any) {
    this.activeStatusFilter.set(event.detail.value);
  }

  onPriorityFilterChange(event: any) {
    this.activePriorityFilter.set(event.target.value);
  }

  saveTask() {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const formData = this.taskForm.value;

    if (this.isEditing()) {
      const taskId = this.editingTaskId();
      const existingTask = this.tasks().find(t => t.id === taskId);
      if (existingTask && taskId) {
        const updatedTask: Task = {
          ...existingTask,
          ...formData
        };
        this.taskService.updateTask(updatedTask);
      }
    } else {
      this.taskService.addTask(formData);
    }

    this.closeModal();
  }

  toggleTaskStatus(task: Task) {
    const updatedTask: Task = {
      ...task,
      status: task.status === 'completed' ? 'pending' : 'completed'
    };

    this.taskService.updateTask(updatedTask);
  }

  deleteTask(id: string) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(id);
    }
  }
}
