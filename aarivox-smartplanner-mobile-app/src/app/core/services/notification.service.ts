import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationItem, NotificationPriority } from '../models/notification.model';
import { AlarmService } from './alarm.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private alarmService = inject(AlarmService);

  private notificationsSignal = signal<NotificationItem[]>([]);

  // Public Signals
  notifications = computed(() => this.notificationsSignal());
  
  unreadCount = computed(() => {
    return this.notificationsSignal().filter(n => !n.isRead).length;
  });

  constructor() {
    this.loadNotifications();
  }
  private loadNotifications() {
    const saved = localStorage.getItem('aarivox_notifications');
    if (saved) {
      const parsed = JSON.parse(saved).filter((n: any) => n.id !== 'notif-1' && n.id !== 'notif-2' && n.id !== 'notif-3');
      this.notificationsSignal.set(parsed);
      this.saveToStorage(parsed);
    } else {
      this.notificationsSignal.set([]);
      this.saveToStorage([]);
    }
  }

  private saveToStorage(notifs: NotificationItem[]) {
    localStorage.setItem('aarivox_notifications', JSON.stringify(notifs));
  }

  addNotification(title: string, content: string, type: NotificationPriority = 'info') {
    const newNotif: NotificationItem = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    const updated = [newNotif, ...this.notificationsSignal()];
    this.notificationsSignal.set(updated);
    this.saveToStorage(updated);
  }

  markAsRead(id: string) {
    const updated = this.notificationsSignal().map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notificationsSignal.set(updated);
    this.saveToStorage(updated);
  }

  markAllAsRead() {
    const updated = this.notificationsSignal().map(n => ({ ...n, isRead: true }));
    this.notificationsSignal.set(updated);
    this.saveToStorage(updated);
  }

  deleteNotification(id: string) {
    const updated = this.notificationsSignal().filter(n => n.id !== id);
    this.notificationsSignal.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * Initializes Capacitor Push Notifications
   */
  async initPushNotifications() {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission denied.');
        return;
      }
      
      await PushNotifications.register();
      
      PushNotifications.addListener('registration', (token: any) => {
        console.log('Push registration success. FCM Token: ' + token.value);
        this.sendFcmTokenToBackend(token.value);
      });
      
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error: ', error);
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('Foreground push notification received: ', notification);
        this.addNotification(
          notification.title || 'Task Reminder',
          notification.body || 'You have an upcoming event.',
          'high'
        );
        
        // Trigger high-attention MP3 alarm and vibration
        this.alarmService.startAlarm();
      });
      
      PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('Push action performed: ', action);
      });
      
    } catch (e) {
      console.warn('Push notifications not supported on this platform/web browser.', e);
    }
  }

  private sendFcmTokenToBackend(token: string) {
    this.http.post(`${environment.apiUrl}/auth/fcm-token?fcmToken=${token}`, {}).subscribe({
      next: () => console.log('FCM token synchronized with backend database.'),
      error: (err) => console.error('Failed to sync FCM token with backend: ', err)
    });
  }
}
