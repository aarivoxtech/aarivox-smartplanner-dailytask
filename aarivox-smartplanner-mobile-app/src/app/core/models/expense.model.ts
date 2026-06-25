export type ExpenseCategory = 'Food' | 'Travel' | 'Bills' | 'Shopping' | 'Others';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;  // YYYY-MM-DD format
  notes?: string;
  createdAt: string; // ISO String
}
