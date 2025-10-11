import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuietHours } from '@core/models/subscription.model';
import { SubscriptionManagerService } from '@core/services/subscription-manager.service';
import { PushNotificationService } from '@core/services/push-notification.service';
import { OfflineStorageService } from '@core/services/offline-storage.service';

@Component({
  selector: 'app-subscription-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule
  ],
  templateUrl: './subscription-settings.component.html',
  styleUrl: './subscription-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionSettingsComponent implements OnInit {
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly pushService = inject(PushNotificationService);
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly destroyRef = inject(DestroyRef);

  quietHours: QuietHours = {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
    allowCritical: true
  };

  endpoint = signal('');
  isPushEnabled = signal(false);
  databaseSize = signal(0);

  ngOnInit(): void {
    this.loadSettings();
    this.loadEndpoint();
    this.loadDatabaseSize();
  }

  private loadSettings(): void {
    this.subscriptionManager.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      if (prefs?.quietHours) {
        this.quietHours = { ...prefs.quietHours };
      }
    });
  }

  private loadEndpoint(): void {
    this.pushService.subscription$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(subscription => {
      if (subscription) {
        this.endpoint.set(subscription.endpoint);
        this.isPushEnabled.set(true);
      }
    });
  }

  private loadDatabaseSize(): void {
    this.offlineStorage.getDatabaseSize().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(size => {
      this.databaseSize.set(size);
    });
  }

  saveQuietHours(): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.updateQuietHours(currentEndpoint, this.quietHours).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          console.log('Quiet hours updated');
          alert('Settings saved successfully');
        },
        error: (err) => {
          console.error('Failed to update quiet hours', err);
          alert('Failed to save settings');
        }
      });
    }
  }

  disablePushNotifications(): void {
    if (confirm('Are you sure you want to disable push notifications?')) {
      this.pushService.unsubscribe().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          console.log('Push notifications disabled');
          this.isPushEnabled.set(false);
          alert('Push notifications disabled successfully');
        },
        error: (err) => {
          console.error('Failed to disable push notifications', err);
          alert('Failed to disable push notifications');
        }
      });
    }
  }

  clearCache(): void {
    if (confirm('This will clear all cached data. Continue?')) {
      this.offlineStorage.clearAllCache().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          console.log('Cache cleared');
          this.loadDatabaseSize();
          alert('Cache cleared successfully');
        },
        error: (err) => {
          console.error('Failed to clear cache', err);
          alert('Failed to clear cache');
        }
      });
    }
  }

  clearAllData(): void {
    if (confirm('This will delete ALL your data including notifications and subscriptions. This action cannot be undone. Continue?')) {
      this.offlineStorage.clearAllData().pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          this.subscriptionManager.clearPreferences();
          this.loadDatabaseSize();
          alert('All data cleared successfully');
        },
        error: (err) => {
          console.error('Failed to clear data', err);
          alert('Failed to clear data');
        }
      });
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

