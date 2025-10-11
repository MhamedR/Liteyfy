import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Notification } from '@core/models/notification.model';
import { OfflineStorageService } from './offline-storage.service';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationHistoryService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private offlineStorage: OfflineStorageService) {
    this.loadNotifications();
  }

  /**
   * Load notifications from offline storage
   */
  loadNotifications(): void {
    this.offlineStorage.getNotifications().subscribe(notifications => {
      this.notificationsSubject.next(notifications);
      this.updateUnreadCount(notifications);
    });
  }

  /**
   * Add new notification
   */
  addNotification(notification: Notification): Observable<string> {
    return this.offlineStorage.saveNotification(notification).pipe(
      tap(() => this.loadNotifications())
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<number> {
    return this.offlineStorage.markNotificationAsRead(notificationId).pipe(
      tap(() => this.loadNotifications())
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const notifications = this.notificationsSubject.value;
    const unreadNotifications = notifications.filter(n => !n.read);
    
    unreadNotifications.forEach(notification => {
      this.offlineStorage.markNotificationAsRead(notification.id).subscribe();
    });
    
    this.loadNotifications();
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.offlineStorage.deleteNotification(notificationId).pipe(
      tap(() => this.loadNotifications())
    );
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(daysToKeep: number = 7): Observable<number> {
    return this.offlineStorage.clearOldNotifications(daysToKeep).pipe(
      tap(() => this.loadNotifications())
    );
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Observable<Notification[]> {
    return this.offlineStorage.getUnreadNotifications();
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Get current notifications
   */
  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }
}

