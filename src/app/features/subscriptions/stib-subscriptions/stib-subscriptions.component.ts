import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StibLineSubscription } from '@core/models/subscription.model';
import { SubscriptionManagerService } from '@core/services/subscription-manager.service';
import { PushNotificationService } from '@core/services/push-notification.service';

@Component({
  selector: 'app-stib-subscriptions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatChipsModule,
    TranslateModule
  ],
  templateUrl: './stib-subscriptions.component.html',
  styleUrl: './stib-subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StibSubscriptionsComponent implements OnInit {
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly pushService = inject(PushNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  stibLines = signal<StibLineSubscription[]>([]);
  endpoint = signal('');

  // Popular STIB lines
  popularLines = [
    { id: 'metro-1', name: 'Metro 1', lineType: 'METRO' as const },
    { id: 'metro-2', name: 'Metro 2', lineType: 'METRO' as const },
    { id: 'metro-5', name: 'Metro 5', lineType: 'METRO' as const },
    { id: 'metro-6', name: 'Metro 6', lineType: 'METRO' as const },
    { id: 'tram-3', name: 'Tram 3', lineType: 'TRAM' as const },
    { id: 'tram-4', name: 'Tram 4', lineType: 'TRAM' as const },
    { id: 'tram-7', name: 'Tram 7', lineType: 'TRAM' as const },
    { id: 'tram-25', name: 'Tram 25', lineType: 'TRAM' as const },
    { id: 'bus-38', name: 'Bus 38', lineType: 'BUS' as const },
    { id: 'bus-71', name: 'Bus 71', lineType: 'BUS' as const }
  ];

  ngOnInit(): void {
    this.loadSubscriptions();
    this.loadEndpoint();
  }

  private loadSubscriptions(): void {
    this.subscriptionManager.preferences$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(prefs => {
      if (prefs) {
        this.stibLines.set(prefs.stibLines);
      }
    });
  }

  private loadEndpoint(): void {
    this.pushService.subscription$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(subscription => {
      if (subscription) {
        this.endpoint.set(subscription.endpoint);
      }
    });
  }

  addLine(line: any): void {
    const newSubscription: StibLineSubscription = {
      lineId: line.id,
      lineName: line.name,
      lineType: line.lineType,
      enabled: true,
      notifyDisruptions: true
    };

    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.addStibLineSubscription(currentEndpoint, newSubscription).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('STIB line added'),
        error: (err) => console.error('Failed to add STIB line', err)
      });
    }
  }

  removeLine(lineId: string): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.removeStibLineSubscription(currentEndpoint, lineId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('STIB line removed'),
        error: (err) => console.error('Failed to remove STIB line', err)
      });
    }
  }

  updateLine(lineId: string, updates: Partial<StibLineSubscription>): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      const currentPrefs = this.subscriptionManager.getPreferences();
      if (currentPrefs) {
        const updatedPrefs = {
          ...currentPrefs,
          stibLines: currentPrefs.stibLines.map(line =>
            line.lineId === lineId ? { ...line, ...updates } : line
          )
        };
        this.subscriptionManager.updatePreferences(currentEndpoint, updatedPrefs).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe();
      }
    }
  }

  isLineSubscribed(lineId: string): boolean {
    return this.stibLines().some(line => line.lineId === lineId);
  }

  getLineIcon(lineType: string): string {
    switch (lineType) {
      case 'METRO': return 'subway';
      case 'TRAM': return 'tram';
      case 'BUS': return 'directions_bus';
      default: return 'directions_transit';
    }
  }

  getLineColor(lineType: string): string {
    switch (lineType) {
      case 'METRO': return '#ff6b6b';
      case 'TRAM': return '#4ecdc4';
      case 'BUS': return '#95afc0';
      default: return '#7f8c8d';
    }
  }
}

