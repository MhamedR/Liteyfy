/**
 * Custom Service Worker Push Notification Handler
 * This code runs in the Service Worker context
 */

// Listen for push events
self.addEventListener('push', (event: any) => {
  console.log('[Service Worker] Push Received.', event);

  let notificationData: any = {
    title: 'Liteyfy Notification',
    body: 'You have a new update',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'liteyfy-notification',
    requireInteraction: false,
    data: {}
  };

  // Parse push notification data
  if (event.data) {
    try {
      const payload = event.data.json();
      
      if (payload.notification) {
        notificationData = {
          ...notificationData,
          ...payload.notification
        };
      }

      if (payload.data) {
        notificationData.data = payload.data;
      }

      // Customize based on notification type
      if (payload.data?.type) {
        switch (payload.data.type) {
          case 'TRAIN_DELAY':
            notificationData.icon = '/assets/icons/train-icon.png';
            notificationData.badge = '/assets/icons/train-badge.png';
            notificationData.vibrate = [300, 100, 300];
            break;
          
          case 'WEATHER_ALERT':
            notificationData.icon = '/assets/icons/weather-icon.png';
            notificationData.badge = '/assets/icons/weather-badge.png';
            notificationData.vibrate = [500, 200, 500];
            notificationData.requireInteraction = payload.data.severity === 'RED';
            break;
          
          case 'TRAIN_CANCELLATION':
            notificationData.icon = '/assets/icons/cancel-icon.png';
            notificationData.badge = '/assets/icons/cancel-badge.png';
            notificationData.vibrate = [400, 200, 400, 200, 400];
            notificationData.requireInteraction = true;
            break;
        }
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  // Show notification
  const promiseChain = (self as any).registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: notificationData.vibrate,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: getNotificationActions(notificationData.data?.type)
    }
  );

  event.waitUntil(promiseChain);
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event: any) => {
  console.log('[Service Worker] Notification click received.', event);

  event.notification.close();

  // Determine URL to open based on notification data
  let urlToOpen = '/';
  
  if (event.notification.data) {
    const data = event.notification.data;
    
    switch (data.type) {
      case 'TRAIN_DELAY':
      case 'TRAIN_CANCELLATION':
        urlToOpen = '/live-status?tab=trains';
        break;
      
      case 'WEATHER_ALERT':
        urlToOpen = '/live-status?tab=weather';
        break;
      
      case 'STIB_DISRUPTION':
        urlToOpen = '/live-status?tab=stib';
        break;
      
      default:
        urlToOpen = '/notifications';
    }

    // Handle action buttons
    if (event.action === 'view') {
      urlToOpen = data.actionUrl || urlToOpen;
    } else if (event.action === 'dismiss') {
      return; // Just close notification
    }
  }

  // Open or focus the app
  event.waitUntil(
    (self as any).clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              return client.navigate(urlToOpen);
            });
          }
        }
        
        // Open new window if app is not open
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(urlToOpen);
        }
      })
  );
});

// Helper function to get notification actions based on type
function getNotificationActions(type: string): any[] {
  const actions: any[] = [
    {
      action: 'view',
      title: 'View Details',
      icon: '/assets/icons/view-icon.png'
    },
    {
      action: 'dismiss',
      title: 'Dismiss',
      icon: '/assets/icons/dismiss-icon.png'
    }
  ];

  return actions;
}

// Background sync for offline notifications
self.addEventListener('sync', (event: any) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  console.log('[Service Worker] Syncing notifications...');
  
  try {
    // In production, fetch pending notifications from server
    // and store them in IndexedDB
    const response = await fetch('/api/notifications/pending');
    if (response.ok) {
      const notifications = await response.json();
      // Store in IndexedDB
      console.log('[Service Worker] Synced notifications:', notifications);
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

export {};

