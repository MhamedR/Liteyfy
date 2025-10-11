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
import { WeatherRegionSubscription, WeatherAlertType } from '@core/models/subscription.model';
import { SubscriptionManagerService } from '@core/services/subscription-manager.service';
import { PushNotificationService } from '@core/services/push-notification.service';

@Component({
  selector: 'app-weather-subscriptions',
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
  templateUrl: './weather-subscriptions.component.html',
  styleUrl: './weather-subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeatherSubscriptionsComponent implements OnInit {
  private readonly subscriptionManager = inject(SubscriptionManagerService);
  private readonly pushService = inject(PushNotificationService);
  private readonly destroyRef = inject(DestroyRef);

  weatherRegions = signal<WeatherRegionSubscription[]>([]);
  endpoint = signal('');

  // Belgian provinces/regions
  availableRegions = [
    { id: 'brussels', name: 'Brussels-Capital Region' },
    { id: 'antwerp', name: 'Antwerp Province' },
    { id: 'flemish-brabant', name: 'Flemish Brabant' },
    { id: 'walloon-brabant', name: 'Walloon Brabant' },
    { id: 'west-flanders', name: 'West Flanders' },
    { id: 'east-flanders', name: 'East Flanders' },
    { id: 'hainaut', name: 'Hainaut Province' },
    { id: 'liege', name: 'Liège Province' },
    { id: 'limburg', name: 'Limburg Province' },
    { id: 'luxembourg', name: 'Luxembourg Province' },
    { id: 'namur', name: 'Namur Province' }
  ];

  alertTypes = [
    { value: WeatherAlertType.THUNDERSTORM, label: 'Thunderstorm', icon: 'flash_on' },
    { value: WeatherAlertType.HEAVY_RAIN, label: 'Heavy Rain', icon: 'water_drop' },
    { value: WeatherAlertType.SNOW, label: 'Snow', icon: 'ac_unit' },
    { value: WeatherAlertType.ICE, label: 'Ice', icon: 'ac_unit' },
    { value: WeatherAlertType.WIND, label: 'Wind', icon: 'air' },
    { value: WeatherAlertType.FOG, label: 'Fog', icon: 'cloud' },
    { value: WeatherAlertType.HEAT, label: 'Heat', icon: 'whatshot' },
    { value: WeatherAlertType.COLD, label: 'Cold', icon: 'severe_cold' }
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
        this.weatherRegions.set(prefs.weatherRegions);
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

  addRegion(region: any): void {
    const newSubscription: WeatherRegionSubscription = {
      regionId: region.id,
      regionName: region.name,
      enabled: true,
      alertTypes: Object.values(WeatherAlertType)
    };

    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.addWeatherRegionSubscription(currentEndpoint, newSubscription).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('Weather region added'),
        error: (err) => console.error('Failed to add weather region', err)
      });
    }
  }

  removeRegion(regionId: string): void {
    const currentEndpoint = this.endpoint();
    if (currentEndpoint) {
      this.subscriptionManager.removeWeatherRegionSubscription(currentEndpoint, regionId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => console.log('Weather region removed'),
        error: (err) => console.error('Failed to remove weather region', err)
      });
    }
  }

  toggleAlertType(region: WeatherRegionSubscription, alertType: WeatherAlertType): void {
    const index = region.alertTypes.indexOf(alertType);
    if (index > -1) {
      region.alertTypes.splice(index, 1);
    } else {
      region.alertTypes.push(alertType);
    }

    const currentEndpoint = this.endpoint();
    if (currentEndpoint && region.regionId) {
      this.subscriptionManager.preferences$.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(prefs => {
        if (prefs) {
          this.subscriptionManager.updatePreferences(currentEndpoint, prefs).pipe(
            takeUntilDestroyed(this.destroyRef)
          ).subscribe();
        }
      });
    }
  }

  isAlertTypeEnabled(region: WeatherRegionSubscription, alertType: WeatherAlertType): boolean {
    return region.alertTypes.includes(alertType);
  }

  isRegionSubscribed(regionId: string): boolean {
    return this.weatherRegions().some(region => region.regionId === regionId);
  }
}

