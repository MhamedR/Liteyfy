import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { UserSubscription } from '@core/models/subscription.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly vapidPublicKey = environment.vapidPublicKey;
  private subscriptionSubject = new BehaviorSubject<PushSubscription | null>(null);
  public subscription$ = this.subscriptionSubject.asObservable();

  constructor(
    private swPush: SwPush,
    private http: HttpClient
  ) {
    this.checkExistingSubscription();
  }

  /**
   * Check if there's an existing push subscription
   */
  private checkExistingSubscription(): void {
    if (this.swPush.isEnabled) {
      this.swPush.subscription.subscribe(subscription => {
        this.subscriptionSubject.next(subscription);
      });
    }
  }

  /**
   * Request push notification permission and subscribe
   */
  requestSubscription(): Observable<UserSubscription> {
    if (!this.swPush.isEnabled) {
      return throwError(() => new Error('Service Worker not enabled'));
    }

    return from(this.swPush.requestSubscription({
      serverPublicKey: this.vapidPublicKey
    })).pipe(
      switchMap((subscription: PushSubscription) => {
        this.subscriptionSubject.next(subscription);
        return this.savePushSubscription(subscription);
      }),
      catchError(error => {
        console.error('Push subscription failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe(): Observable<boolean> {
    return this.swPush.subscription.pipe(
      switchMap(subscription => {
        if (!subscription) {
          return from(Promise.resolve(true));
        }
        
        return from(subscription.unsubscribe()).pipe(
          switchMap(() => this.deletePushSubscription(subscription)),
          map(() => {
            this.subscriptionSubject.next(null);
            return true;
          })
        );
      }),
      catchError(error => {
        console.error('Unsubscribe failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Listen to push notification messages
   */
  listenToNotifications(): Observable<any> {
    return this.swPush.messages;
  }

  /**
   * Listen to notification clicks
   */
  listenToNotificationClicks(): Observable<any> {
    return this.swPush.notificationClicks;
  }

  /**
   * Save push subscription to backend
   */
  private savePushSubscription(subscription: PushSubscription): Observable<UserSubscription> {
    const subscriptionJson = subscription.toJSON();
    
    const userSubscription: Partial<UserSubscription> = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.['p256dh'] || '',
        auth: subscriptionJson.keys?.['auth'] || ''
      },
      preferences: {
        trainLines: [],
        stations: [],
        weatherRegions: [],
        stibLines: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.http.post<UserSubscription>(
      `${environment.apiUrl}/subscriptions`,
      userSubscription
    );
  }

  /**
   * Delete push subscription from backend
   */
  private deletePushSubscription(subscription: PushSubscription): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/subscriptions/${subscription.endpoint}`
    );
  }

  /**
   * Test push notification (for development)
   */
  testNotification(): void {
    if (this.isNotificationSupported() && this.getPermissionStatus() === 'granted') {
      new Notification('Liteyfy Test', {
        body: 'This is a test notification from Liteyfy',
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        tag: 'test-notification',
        requireInteraction: false
      } as NotificationOptions);
    }
  }
}

