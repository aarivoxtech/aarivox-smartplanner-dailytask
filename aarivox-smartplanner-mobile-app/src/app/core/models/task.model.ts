export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;       // YYYY-MM-DD format
  reminderDate?: string; // YYYY-MM-DD format
  reminderTime?: string; // HH:MM format
  status: TaskStatus;
  createdAt: string;     // ISO String
}
