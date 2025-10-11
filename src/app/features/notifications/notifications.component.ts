import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Notification, NotificationType, NotificationPriority } from '@core/models/notification.model';
import { NotificationHistoryService } from '@core/services/notification-history.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatBadgeModule,
    TranslateModule
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent implements OnInit {
  private readonly notificationHistory = inject(NotificationHistoryService);
  private readonly destroyRef = inject(DestroyRef);

  notifications$!: Observable<Notification[]>;
  unreadCount$!: Observable<number>;

  ngOnInit(): void {
    this.notifications$ = this.notificationHistory.notifications$;
    this.unreadCount$ = this.notificationHistory.unreadCount$;
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationHistory.markAsRead(notification.id).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
    }
  }

  markAllAsRead(): void {
    this.notificationHistory.markAllAsRead();
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationHistory.deleteNotification(notification.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  clearOld(): void {
    if (confirm('Clear notifications older than 7 days?')) {
      this.notificationHistory.clearOldNotifications(7).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
    }
  }

  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.TRAIN_DELAY:
        return 'schedule';
      case NotificationType.TRAIN_CANCELLATION:
        return 'cancel';
      case NotificationType.WEATHER_ALERT:
        return 'warning';
      case NotificationType.STIB_DISRUPTION:
        return 'error_outline';
      case NotificationType.PLATFORM_CHANGE:
        return 'swap_horiz';
      default:
        return 'notifications';
    }
  }

  getNotificationColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.CRITICAL:
        return '#f44336';
      case NotificationPriority.HIGH:
        return '#ff9800';
      case NotificationPriority.MEDIUM:
        return '#2196f3';
      case NotificationPriority.LOW:
        return '#4caf50';
      default:
        return '#757575';
    }
  }

  getPriorityLabel(priority: NotificationPriority): string {
    return priority.toLowerCase();
  }

  formatTime(date: Date): string {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notifDate.toLocaleDateString();
  }
}

