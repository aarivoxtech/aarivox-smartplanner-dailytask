import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { ReminderService } from '../core/services/reminder.service';
import { Reminder, ReminderPriority, ReminderStatus } from '../core/models/reminder.model';

@Component({
  selector: 'app-reminders',
  standalone: true,
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
    IonSegmentButton
  ],
  templateUrl: './reminders.component.html',
  styleUrls: ['./reminders.component.scss']
})
export class RemindersComponent implements OnInit {
  private reminderService = inject(ReminderService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Core reminders list signal
  reminders = this.reminderService.reminders;

  // Search & Filter state
  searchQuery = signal('');
  activeStatusFilter = signal<'all' | 'pending' | 'completed'>('all');
  activePriorityFilter = signal<'all' | 'high' | 'medium' | 'low'>('all');

  // Filtered lists
  filteredReminders = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.activeStatusFilter();
    const priority = this.activePriorityFilter();

    return this.reminders()
      .filter(reminder => {
        const matchesSearch = reminder.title.toLowerCase().includes(query) || 
                              reminder.description.toLowerCase().includes(query);
        const matchesStatus = status === 'all' || reminder.status === status;
        const matchesPriority = priority === 'all' || reminder.priority === priority;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const timeA = new Date(`${a.reminderDate}T${a.reminderTime}`).getTime();
        const timeB = new Date(`${b.reminderDate}T${b.reminderTime}`).getTime();
        return timeA - timeB; // upcoming first
      });
  });

  // Modal form states
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingReminderId = signal<string | null>(null);
  reminderForm: FormGroup;

  constructor() {
    this.reminderForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', [Validators.required]],
      reminderDate: [new Date().toISOString().split('T')[0], [Validators.required]],
      reminderTime: ['12:00', [Validators.required]],
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
    this.route.queryParams.subscribe(params => {
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
    this.editingReminderId.set(null);
    this.reminderForm.reset({
      title: '',
      description: '',
      priority: 'medium',
      reminderDate: new Date().toISOString().split('T')[0],
      reminderTime: '12:00',
      status: 'pending'
    });
    this.isModalOpen.set(true);
  }

  openEditModal(reminder: Reminder) {
    this.isEditing.set(true);
    this.editingReminderId.set(reminder.id);
    this.reminderForm.patchValue({
      title: reminder.title,
      description: reminder.description,
      priority: reminder.priority,
      reminderDate: reminder.reminderDate,
      reminderTime: reminder.reminderTime,
      status: reminder.status
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
    this.activePriorityFilter.set(event.detail.value);
  }

  saveReminder() {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      return;
    }

    const formData = this.reminderForm.value;

    if (this.isEditing()) {
      const id = this.editingReminderId();
      const existing = this.reminders().find(r => r.id === id);
      if (existing && id) {
        const updated: Reminder = {
          ...existing,
          ...formData
        };
        this.reminderService.updateReminder(updated);
      }
    } else {
      this.reminderService.addReminder(formData);
    }

    this.closeModal();
  }

  toggleReminderStatus(reminder: Reminder) {
    const updated: Reminder = {
      ...reminder,
      status: reminder.status === 'completed' ? 'pending' : 'completed'
    };
    this.reminderService.updateReminder(updated);
  }

  deleteReminder(id: string) {
    if (confirm('Are you sure you want to delete this reminder?')) {
      this.reminderService.deleteReminder(id);
    }
  }
}
