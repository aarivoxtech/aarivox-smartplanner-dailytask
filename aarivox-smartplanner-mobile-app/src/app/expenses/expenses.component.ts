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
  cashOutline, 
  analyticsOutline, 
  listOutline,
  closeOutline,
  walletOutline,
  gridOutline
} from 'ionicons/icons';
import { ExpenseService } from '../core/services/expense.service';
import { Expense } from '../core/models/expense.model';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-expenses',
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
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent implements OnInit {
  private expenseService = inject(ExpenseService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // Core signals
  expenses = this.expenseService.expenses;
  totalExpenses = this.expenseService.totalExpenses;
  todayExpenses = this.expenseService.todayExpenses;
  categorySummaries = this.expenseService.categorySummary;

  // View state
  activeTab = signal<'transactions' | 'analytics'>('transactions');
  searchQuery = signal('');
  viewMode = signal<'cards' | 'table'>('table'); // Default to table format
  activeDateFilter = signal<'all' | 'today' | 'yesterday' | 'month'>('all');

  // Filtered lists
  filteredExpenses = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const dateFilter = this.activeDateFilter();
    let list = this.expenses();

    // Calculate dates dynamically
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

    if (dateFilter === 'today') {
      list = list.filter(item => item.date === todayStr);
    } else if (dateFilter === 'yesterday') {
      list = list.filter(item => item.date === yesterdayStr);
    } else if (dateFilter === 'month') {
      list = list.filter(item => item.date.startsWith(thisMonthStr));
    }

    let result = list;
    if (query) {
      result = list.filter(item => 
        item.notes?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.amount.toString().includes(query)
      );
    }

    // Sort by transaction date descending, then secondary-sort by creation timestamp descending (latest first)
    return [...result].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA;
    });
  });

  // Modal form states
  isModalOpen = signal(false);
  isEditing = signal(false);
  editingExpenseId = signal<string | null>(null);
  expenseForm: FormGroup;

  constructor() {
    this.expenseForm = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      category: ['Food', [Validators.required]],
      date: [new Date().toISOString().split('T')[0], [Validators.required]],
      notes: ['']
    });

    addIcons({
      searchOutline,
      addOutline,
      trashOutline,
      createOutline,
      calendarOutline,
      cashOutline,
      analyticsOutline,
      listOutline,
      closeOutline,
      walletOutline,
      gridOutline
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef) // Clean up routing subscription
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
    this.editingExpenseId.set(null);
    this.expenseForm.reset({
      amount: null,
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    this.isModalOpen.set(true);
  }

  openEditModal(item: Expense) {
    this.isEditing.set(true);
    this.editingExpenseId.set(item.id);
    this.expenseForm.patchValue({
      amount: item.amount,
      category: item.category,
      date: item.date,
      notes: item.notes || ''
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onSearch(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
  }

  saveExpense() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const formData = this.expenseForm.value;
    const amountVal = parseFloat(formData.amount);
    
    const preparedData = {
      ...formData,
      amount: amountVal
    };

    if (this.isEditing()) {
      const expenseId = this.editingExpenseId();
      const existing = this.expenses().find(e => e.id === expenseId);
      if (existing && expenseId) {
        const updatedExpense: Expense = {
          ...existing,
          ...preparedData
        };
        this.expenseService.updateExpense(updatedExpense);
      }
    } else {
      this.expenseService.addExpense(preparedData);
    }

    this.closeModal();
  }

  deleteExpense(id: string) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.expenseService.deleteExpense(id);
    }
  }
}
