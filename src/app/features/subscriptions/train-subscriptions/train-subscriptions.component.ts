import { Component, OnInit, ChangeDetectionStrategy, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TrainLineSubscription } from '@core/models/subscription.model';
import { SubscriptionManagerService } from '@core/services/subscription-manager.service';
import { PushNotificationService } from '@core/services/push-notification.service';

@Component({
  selector: 'app-train-subscriptions',
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
    MatSelectModule,
    MatChipsModule,
    TranslateModule
  ],
  templateUrl: './train-subscriptions.component.html',
  styleUrl: './train-subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrainSubscriptionsComponent implements OnInit {
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly pushService = inject(PushNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  trainLines = signal<TrainLineSubscription[]>([]);
  endpoint = signal('');

  // Sample popular train lines (in production, fetch from API)
  popularLines = [
    { id: 'IC-Brussels-Antwerp', name: 'IC Brussels - Antwerp', number: 'IC' },
    { id: 'IC-Brussels-Ghent', name: 'IC Brussels - Ghent', number: 'IC' },
    { id: 'IC-Brussels-Liege', name: 'IC Brussels - Liège', number: 'IC' },
    { id: 'S1-Brussels', name: 'S1 Brussels RER', number: 'S1' },
    { id: 'S2-Brussels', name: 'S2 Brussels RER', number: 'S2' }
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
        this.trainLines.set(prefs.trainLines);
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
    const newSubscription: TrainLineSubscription = {
      lineId: line.id,
      lineName: line.name,
      enabled: true,
      notifyDelays: true,
      notifyCancellations: true,
      minDelayMinutes: 5
    };

    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.addTrainLineSubscription(currentEndpoint, newSubscription).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('Train line added'),
        error: (err) => console.error('Failed to add train line', err)
      });
    }
  }

  removeLine(lineId: string): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.removeTrainLineSubscription(currentEndpoint, lineId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('Train line removed'),
        error: (err) => console.error('Failed to remove train line', err)
      });
    }
  }

  updateLine(lineId: string, updates: Partial<TrainLineSubscription>): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.updateTrainLineSubscription(currentEndpoint, lineId, updates).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('Train line updated'),
        error: (err) => console.error('Failed to update train line', err)
      });
    }
  }

  isLineSubscribed(lineId: string): boolean {
    return this.trainLines().some(line => line.lineId === lineId);
  }
}

