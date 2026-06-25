export type ReminderPriority = 'high' | 'medium' | 'low';
export type ReminderStatus = 'pending' | 'completed';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  reminderDate: string; // YYYY-MM-DD format
  reminderTime: string; // HH:MM format
  priority: ReminderPriority;
  status: ReminderStatus;
}
