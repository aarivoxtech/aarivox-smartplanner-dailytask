export type NotificationPriority = 'high' | 'medium' | 'info';

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: NotificationPriority;
  isRead: boolean;
  createdAt: string; // ISO String or relative format
}
