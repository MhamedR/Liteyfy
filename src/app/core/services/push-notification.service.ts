import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Observable, from, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
    console.log('🔔 requestSubscription() called');
    console.log('Service Worker enabled:', this.swPush.isEnabled);
    console.log('VAPID key configured:', this.vapidPublicKey ? 'Yes' : 'No');
    console.log('VAPID key length:', this.vapidPublicKey?.length);

    if (!this.swPush.isEnabled) {
      console.error('❌ Service Worker not enabled!');
      return throwError(() => new Error('Service Worker not enabled. Please refresh the page.'));
    }

    console.log('📝 Requesting push subscription from browser...');

    return from(this.swPush.requestSubscription({
      serverPublicKey: this.vapidPublicKey
    })).pipe(
      switchMap((subscription: PushSubscription) => {
        console.log('✅ Browser push subscription successful:', subscription);
        this.subscriptionSubject.next(subscription);
        console.log('💾 Saving subscription to backend...');
        return this.savePushSubscription(subscription);
      }),
      catchError(error => {
        console.error('❌ Push subscription failed:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
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

    // Generate a unique userId from the subscription endpoint
    const userId = this.generateUserId(subscription.endpoint);

    const userSubscription = {
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys?.['p256dh'] || '',
      auth: subscriptionJson.keys?.['auth'] || '',
      trainLines: [],
      stations: [],
      weatherRegions: [],
      stibLines: [],
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        allowCritical: true
      },
      language: 'en',
      active: true
    };

    console.log('📤 Sending subscription to backend:', {
      endpoint: userSubscription.endpoint.substring(0, 50) + '...',
      hasP256dh: !!userSubscription.p256dh,
      hasAuth: !!userSubscription.auth,
      apiUrl: `${environment.apiUrl}/subscriptions`
    });

    return this.http.post<UserSubscription>(
      `${environment.apiUrl}/subscriptions`,
      userSubscription
    ).pipe(
      map(response => {
        console.log('✅ Backend saved subscription successfully:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ Backend save failed:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        return throwError(() => new Error(`HTTP ${error.status}: ${error.message}`));
      })
    );
  }

  /**
   * Generate a unique userId from the subscription endpoint
   */
  private generateUserId(endpoint: string): string {
    // Extract a unique identifier from the endpoint
    // Use the last part of the endpoint URL as a simple hash
    const parts = endpoint.split('/');
    return parts[parts.length - 1] || `user-${Date.now()}`;
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

