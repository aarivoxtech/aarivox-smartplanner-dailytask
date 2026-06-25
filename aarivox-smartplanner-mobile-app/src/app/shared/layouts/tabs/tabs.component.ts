import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonButton, 
  IonBadge, 
  IonTabs, 
  IonTabBar, 
  IonTabButton, 
  IonIcon, 
  IonLabel 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gridOutline, 
  listOutline, 
  walletOutline, 
  personOutline, 
  notificationsOutline, 
  closeOutline, 
  checkmarkDoneOutline, 
  trashOutline,
  alertCircleOutline,
  informationCircleOutline,
  analyticsOutline,
  settingsOutline,
  logOutOutline,
  searchOutline
} from 'ionicons/icons';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonBadge,
    IonContent
  ],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  // Expose signals to the view
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  currentUser = this.authService.currentUser;

  // Drawer state
  isNotificationOpen = signal(false);
  activeFilter = signal<'all' | 'high' | 'medium' | 'info'>('all');
  
  // Profile dropdown state
  isProfileOpen = signal(false);

  // Filtered notifications
  filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    const list = this.notifications();
    if (filter === 'all') return list;
    return list.filter(n => n.type === filter);
  });

  constructor() {
    // Register icons for standalone usage
    addIcons({ 
      gridOutline, 
      listOutline, 
      walletOutline, 
      personOutline, 
      notificationsOutline, 
      closeOutline, 
      checkmarkDoneOutline, 
      trashOutline,
      alertCircleOutline,
      informationCircleOutline,
      analyticsOutline,
      settingsOutline,
      logOutOutline,
      searchOutline
    });
  }

  toggleProfileDropdown() {
    this.isProfileOpen.update(val => !val);
  }

  logout() {
    this.authService.logout();
  }

  toggleNotifications() {
    this.isNotificationOpen.update(val => !val);
  }

  setFilter(filter: 'all' | 'high' | 'medium' | 'info') {
    this.activeFilter.set(filter);
  }

  markRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  markAllRead() {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(id: string) {
    this.notificationService.deleteNotification(id);
  }
}
