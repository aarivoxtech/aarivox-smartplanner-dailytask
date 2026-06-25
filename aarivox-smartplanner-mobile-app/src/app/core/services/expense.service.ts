import { Injectable, signal, computed, inject } from '@angular/core';
import { Expense, ExpenseCategory } from '../models/expense.model';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private apiService = inject(ApiService);

  private expensesSignal = signal<Expense[]>([]);

  // Public Signals
  expenses = computed(() => this.expensesSignal());

  // Analytics Metrics
  totalExpenses = computed(() => {
    return this.expensesSignal().reduce((sum, item) => sum + item.amount, 0);
  });

  todayExpenses = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.expensesSignal()
      .filter(item => item.date === todayStr)
      .reduce((sum, item) => sum + item.amount, 0);
  });

  // Category summary array for quick chart usage
  categorySummary = computed(() => {
    const summary: Record<ExpenseCategory, number> = {
      Food: 0,
      Travel: 0,
      Bills: 0,
      Shopping: 0,
      Others: 0
    };

    this.expensesSignal().forEach(item => {
      if (summary[item.category] !== undefined) {
        summary[item.category] += item.amount;
      } else {
        summary['Others'] += item.amount;
      }
    });

    return Object.entries(summary).map(([name, value]) => ({
      name: name as ExpenseCategory,
      value,
      percentage: this.totalExpenses() > 0 ? Math.round((value / this.totalExpenses()) * 100) : 0
    }));
  });

  // Recent activity feed of expenses (sorted latest first)
  recentExpenses = computed(() => {
    return [...this.expensesSignal()]
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA;
      })
      .slice(0, 5);
  });

  constructor() {
    this.loadExpenses();
    this.syncExpensesWithBackend();
  }

  private loadExpenses() {
    const savedExpenses = localStorage.getItem('aarivox_expenses');
    if (savedExpenses) {
      this.expensesSignal.set(JSON.parse(savedExpenses));
    } else {
      // Create high-quality mock data
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const threeDaysAgo = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0];
      const lastWeek = new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0];

      const initialExpenses: Expense[] = [
        {
          id: 'exp-1',
          amount: 45.50,
          category: 'Food',
          date: today,
          notes: 'Business lunch with client at Cafe Blue',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-2',
          amount: 120.00,
          category: 'Bills',
          date: yesterday,
          notes: 'Monthly high-speed internet subscription',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-3',
          amount: 32.80,
          category: 'Travel',
          date: today,
          notes: 'Uber ride to corporate headquarters',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-4',
          amount: 250.00,
          category: 'Shopping',
          date: threeDaysAgo,
          notes: 'Ergonomic office chair for workspace',
          createdAt: new Date().toISOString()
        },
        {
          id: 'exp-5',
          amount: 15.00,
          category: 'Others',
          date: lastWeek,
          notes: 'Mobile app design resource kit',
          createdAt: new Date().toISOString()
        }
      ];

      this.expensesSignal.set(initialExpenses);
      this.saveToStorage(initialExpenses);
    }
  }

  private saveToStorage(expenses: Expense[]) {
    localStorage.setItem('aarivox_expenses', JSON.stringify(expenses));
  }

  /**
   * Sync expense logs with PostgreSQL database via REST API using ApiService
   */
  async syncExpensesWithBackend() {
    const token = localStorage.getItem('aarivox_auth_token') || sessionStorage.getItem('aarivox_auth_token');
    if (!token) return;

    try {
      const liveExpenses = await firstValueFrom(
        this.apiService.get<Expense[]>('expenses')
      );
      if (liveExpenses) {
        this.expensesSignal.set(liveExpenses);
        this.saveToStorage(liveExpenses);
        console.log('Expenses synced from Spring Boot backend.');
      }
    } catch (e) {
      console.warn('Backend server unreachable. Using expense cache.', e);
    }
  }

  addExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };

    // 1. Optimistic UI update
    const currentExpenses = [...this.expensesSignal(), newExpense];
    this.expensesSignal.set(currentExpenses);
    this.saveToStorage(currentExpenses);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.post('expenses', newExpense).subscribe({
      next: () => console.log('Expense log synchronized to backend database.'),
      error: (err) => console.warn('Could not sync added expense to backend (running in offline mode):', err)
    });

    return newExpense;
  }

  updateExpense(updatedExpense: Expense) {
    // 1. Optimistic UI update
    const currentExpenses = this.expensesSignal().map(expense => 
      expense.id === updatedExpense.id ? updatedExpense : expense
    );
    this.expensesSignal.set(currentExpenses);
    this.saveToStorage(currentExpenses);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.put(`expenses/${updatedExpense.id}`, updatedExpense).subscribe({
      next: () => console.log('Expense update synchronized to backend database.'),
      error: (err) => console.warn('Could not sync updated expense to backend (running in offline mode):', err)
    });
  }

  deleteExpense(id: string) {
    // 1. Optimistic UI update
    const currentExpenses = this.expensesSignal().filter(expense => expense.id !== id);
    this.expensesSignal.set(currentExpenses);
    this.saveToStorage(currentExpenses);

    // 2. Sync to Spring Boot REST backend in background using generic ApiService
    this.apiService.delete(`expenses/${id}`).subscribe({
      next: () => console.log('Expense deletion synchronized to backend database.'),
      error: (err) => console.warn('Could not sync deleted expense to backend (running in offline mode):', err)
    });
  }
}
