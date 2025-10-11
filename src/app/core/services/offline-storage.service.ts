import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Notification } from '@core/models/notification.model';
import { TrainDelay, Station } from '@core/models/train.model';
import { WeatherAlert, WeatherRegion } from '@core/models/weather.model';
import { StibDisruption, StibLine } from '@core/models/stib.model';
import { Observable, from } from 'rxjs';

/**
 * IndexedDB Database using Dexie for offline storage
 * Stores notifications, cached API responses, and user preferences
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService extends Dexie {
  // Define tables
  notifications!: Table<Notification, string>;
  trainDelays!: Table<TrainDelay, string>;
  stations!: Table<Station, string>;
  weatherAlerts!: Table<WeatherAlert, string>;
  weatherRegions!: Table<WeatherRegion, string>;
  stibDisruptions!: Table<StibDisruption, string>;
  stibLines!: Table<StibLine, string>;
  cachedData!: Table<CachedApiResponse, string>;

  constructor() {
    super('LiteyfyDB');
    
    // Define database schema
    this.version(1).stores({
      notifications: 'id, type, timestamp, read',
      trainDelays: 'id, trainNumber, station, scheduledTime',
      stations: 'id, name',
      weatherAlerts: 'id, regionId, startTime, endTime, severity',
      weatherRegions: 'id, name, province',
      stibDisruptions: 'id, lineId, startTime, severity',
      stibLines: 'id, name, type',
      cachedData: 'key, timestamp, expiresAt'
    });
  }

  // ==================== Notifications ====================

  saveNotification(notification: Notification): Observable<string> {
    return from(this.notifications.put(notification));
  }

  getNotifications(limit: number = 50): Observable<Notification[]> {
    return from(
      this.notifications
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray()
    );
  }

  getUnreadNotifications(): Observable<Notification[]> {
    return from(
      this.notifications
        .where('read')
        .equals(0)
        .toArray()
    );
  }

  markNotificationAsRead(id: string): Observable<number> {
    return from(
      this.notifications.update(id, { read: true })
    );
  }

  deleteNotification(id: string): Observable<void> {
    return from(this.notifications.delete(id));
  }

  clearOldNotifications(daysToKeep: number = 7): Observable<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    return from(
      this.notifications
        .where('timestamp')
        .below(cutoffDate)
        .delete()
    );
  }

  // ==================== Train Data ====================

  saveTrainDelays(delays: TrainDelay[]): Observable<string> {
    return from(this.trainDelays.bulkPut(delays));
  }

  getTrainDelays(trainNumber?: string): Observable<TrainDelay[]> {
    if (trainNumber) {
      return from(
        this.trainDelays
          .where('trainNumber')
          .equals(trainNumber)
          .toArray()
      );
    }
    return from(this.trainDelays.toArray());
  }

  saveStations(stations: Station[]): Observable<string> {
    return from(this.stations.bulkPut(stations));
  }

  getStations(): Observable<Station[]> {
    return from(this.stations.toArray());
  }

  searchStations(query: string): Observable<Station[]> {
    return from(
      this.stations
        .filter(station => 
          station.name.toLowerCase().includes(query.toLowerCase()) ||
          station.standardname.toLowerCase().includes(query.toLowerCase())
        )
        .toArray()
    );
  }

  // ==================== Weather Data ====================

  saveWeatherAlerts(alerts: WeatherAlert[]): Observable<string> {
    return from(this.weatherAlerts.bulkPut(alerts));
  }

  getActiveWeatherAlerts(): Observable<WeatherAlert[]> {
    const now = new Date();
    return from(
      this.weatherAlerts
        .where('endTime')
        .above(now)
        .toArray()
    );
  }

  saveWeatherRegions(regions: WeatherRegion[]): Observable<string> {
    return from(this.weatherRegions.bulkPut(regions));
  }

  getWeatherRegions(): Observable<WeatherRegion[]> {
    return from(this.weatherRegions.toArray());
  }

  // ==================== STIB Data ====================

  saveStibDisruptions(disruptions: StibDisruption[]): Observable<string> {
    return from(this.stibDisruptions.bulkPut(disruptions));
  }

  getActiveStibDisruptions(): Observable<StibDisruption[]> {
    const now = new Date();
    return from(
      this.stibDisruptions
        .filter(disruption => 
          !disruption.endTime || disruption.endTime > now
        )
        .toArray()
    );
  }

  saveStibLines(lines: StibLine[]): Observable<string> {
    return from(this.stibLines.bulkPut(lines));
  }

  getStibLines(): Observable<StibLine[]> {
    return from(this.stibLines.toArray());
  }

  // ==================== Generic Cache ====================

  cacheApiResponse(key: string, data: any, ttlMinutes: number = 5): Observable<string> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);
    
    const cachedResponse: CachedApiResponse = {
      key,
      data,
      timestamp: now,
      expiresAt
    };

    return from(this.cachedData.put(cachedResponse));
  }

  getCachedApiResponse<T>(key: string): Observable<T | null> {
    return from(
      this.cachedData.get(key).then(cached => {
        if (!cached) return null;
        
        const now = new Date();
        if (cached.expiresAt < now) {
          // Expired, delete it
          this.cachedData.delete(key);
          return null;
        }
        
        return cached.data as T;
      })
    );
  }

  clearExpiredCache(): Observable<number> {
    const now = new Date();
    return from(
      this.cachedData
        .where('expiresAt')
        .below(now)
        .delete()
    );
  }

  clearAllCache(): Observable<void> {
    return from(this.cachedData.clear());
  }

  // ==================== Database Management ====================

  clearAllData(): Observable<void> {
    return from(
      Promise.all([
        this.notifications.clear(),
        this.trainDelays.clear(),
        this.stations.clear(),
        this.weatherAlerts.clear(),
        this.weatherRegions.clear(),
        this.stibDisruptions.clear(),
        this.stibLines.clear(),
        this.cachedData.clear()
      ]).then(() => undefined)
    );
  }

  getDatabaseSize(): Observable<number> {
    return from(
      navigator.storage?.estimate().then(estimate => estimate.usage || 0) || Promise.resolve(0)
    );
  }
}

interface CachedApiResponse {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt: Date;
}

