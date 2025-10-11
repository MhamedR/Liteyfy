import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PushNotificationService } from '@core/services/push-notification.service';
import { SubscriptionManagerService } from '@core/services/subscription-manager.service';
import { NotificationHistoryService } from '@core/services/notification-history.service';
import { NotificationPreferences } from '@core/models/subscription.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly notificationHistory = inject(NotificationHistoryService);
  private readonly destroyRef = inject(DestroyRef);

  isPushEnabled = signal(false);
  isLoading = signal(false);
  preferences = signal<NotificationPreferences | null>(null);
  recentNotificationsCount = signal(0);

  ngOnInit(): void {
    this.checkPushStatus();
    this.loadPreferences();
    this.loadNotificationStats();
  }

  private checkPushStatus(): void {
    this.pushNotificationService.subscription$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(subscription => {
      this.isPushEnabled.set(subscription !== null);
    });
  }

  private loadPreferences(): void {
    this.subscriptionManager.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      this.preferences.set(prefs);
    });
  }

  private loadNotificationStats(): void {
    this.notificationHistory.unreadCount$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(count => {
      this.recentNotificationsCount.set(count);
    });
  }

  enableNotifications(): void {
    this.isLoading.set(true);
    this.pushNotificationService.requestSubscription().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (subscription) => {
        console.log('Push subscription successful:', subscription);
        this.subscriptionManager.initializeDefaultPreferences();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Push subscription failed:', error);
        this.isLoading.set(false);
        alert('Failed to enable notifications. Please check your browser settings.');
      }
    });
  }

  testNotification(): void {
    this.pushNotificationService.testNotification();
  }

  getTotalSubscriptions(): number {
    const prefs = this.preferences();
    if (!prefs) return 0;
    return (
      prefs.trainLines.filter(l => l.enabled).length +
      prefs.stations.filter(s => s.enabled).length +
      prefs.weatherRegions.filter(r => r.enabled).length +
      prefs.stibLines.filter(l => l.enabled).length
    );
  }

  getPermissionStatus(): string {
    return this.pushNotificationService.getPermissionStatus();
  }

  getEnabledCount(items: any[] | undefined): number {
    if (!items) return 0;
    return items.filter((item: any) => item.enabled).length;
  }
}

