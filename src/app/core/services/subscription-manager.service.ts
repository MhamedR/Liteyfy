import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { 
  UserSubscription, 
  NotificationPreferences,
  TrainLineSubscription,
  StationSubscription,
  WeatherRegionSubscription,
  StibLineSubscription,
  QuietHours
} from '@core/models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionManagerService {
  private readonly STORAGE_KEY = 'liteyfy_preferences';
  private preferencesSubject = new BehaviorSubject<NotificationPreferences | null>(null);
  public preferences$ = this.preferencesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadPreferencesFromStorage();
  }

  /**
   * Load user preferences from local storage
   */
  private loadPreferencesFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const preferences = JSON.parse(stored);
        this.preferencesSubject.next(preferences);
      } catch (error) {
        console.error('Failed to load preferences from storage:', error);
      }
    }
  }

  /**
   * Save preferences to local storage
   */
  private savePreferencesToStorage(preferences: NotificationPreferences): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    this.preferencesSubject.next(preferences);
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferencesSubject.value;
  }

  /**
   * Fetch user subscription from backend
   */
  fetchUserSubscription(endpoint: string): Observable<UserSubscription> {
    return this.http.get<UserSubscription>(
      `${environment.apiUrl}/subscriptions/${encodeURIComponent(endpoint)}`
    ).pipe(
      tap(subscription => {
        this.savePreferencesToStorage(subscription.preferences);
      })
    );
  }

  /**
   * Update user preferences on backend
   */
  updatePreferences(
    endpoint: string,
    preferences: NotificationPreferences
  ): Observable<UserSubscription> {
    return this.http.patch<UserSubscription>(
      `${environment.apiUrl}/subscriptions/${encodeURIComponent(endpoint)}/preferences`,
      preferences
    ).pipe(
      tap(subscription => {
        this.savePreferencesToStorage(subscription.preferences);
      })
    );
  }

  // ==================== Train Line Subscriptions ====================

  addTrainLineSubscription(
    endpoint: string,
    trainLine: TrainLineSubscription
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      trainLines: [...currentPrefs.trainLines, trainLine]
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  removeTrainLineSubscription(
    endpoint: string,
    lineId: string
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      trainLines: currentPrefs.trainLines.filter(line => line.lineId !== lineId)
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  updateTrainLineSubscription(
    endpoint: string,
    lineId: string,
    updates: Partial<TrainLineSubscription>
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      trainLines: currentPrefs.trainLines.map(line =>
        line.lineId === lineId ? { ...line, ...updates } : line
      )
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  // ==================== Station Subscriptions ====================

  addStationSubscription(
    endpoint: string,
    station: StationSubscription
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      stations: [...currentPrefs.stations, station]
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  removeStationSubscription(
    endpoint: string,
    stationId: string
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      stations: currentPrefs.stations.filter(station => station.stationId !== stationId)
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  // ==================== Weather Region Subscriptions ====================

  addWeatherRegionSubscription(
    endpoint: string,
    region: WeatherRegionSubscription
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      weatherRegions: [...currentPrefs.weatherRegions, region]
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  removeWeatherRegionSubscription(
    endpoint: string,
    regionId: string
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      weatherRegions: currentPrefs.weatherRegions.filter(region => region.regionId !== regionId)
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  // ==================== STIB Line Subscriptions ====================

  addStibLineSubscription(
    endpoint: string,
    stibLine: StibLineSubscription
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      stibLines: [...currentPrefs.stibLines, stibLine]
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  removeStibLineSubscription(
    endpoint: string,
    lineId: string
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      stibLines: currentPrefs.stibLines.filter(line => line.lineId !== lineId)
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  // ==================== Quiet Hours ====================

  updateQuietHours(
    endpoint: string,
    quietHours: QuietHours
  ): Observable<UserSubscription> {
    const currentPrefs = this.getPreferences();
    if (!currentPrefs) {
      throw new Error('No preferences loaded');
    }

    const updatedPrefs: NotificationPreferences = {
      ...currentPrefs,
      quietHours
    };

    return this.updatePreferences(endpoint, updatedPrefs);
  }

  // ==================== Utilities ====================

  initializeDefaultPreferences(): NotificationPreferences {
    const defaultPrefs: NotificationPreferences = {
      trainLines: [],
      stations: [],
      weatherRegions: [],
      stibLines: [],
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        allowCritical: true
      }
    };

    this.savePreferencesToStorage(defaultPrefs);
    return defaultPrefs;
  }

  clearPreferences(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.preferencesSubject.next(null);
  }
}

