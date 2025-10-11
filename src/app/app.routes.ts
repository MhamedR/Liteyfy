import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => 
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => 
      import('./features/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  {
    path: 'subscriptions',
    loadComponent: () => 
      import('./features/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
    children: [
      {
        path: '',
        redirectTo: 'trains',
        pathMatch: 'full'
      },
      {
        path: 'trains',
        loadComponent: () => 
          import('./features/subscriptions/train-subscriptions/train-subscriptions.component')
            .then(m => m.TrainSubscriptionsComponent)
      },
      {
        path: 'weather',
        loadComponent: () => 
          import('./features/subscriptions/weather-subscriptions/weather-subscriptions.component')
            .then(m => m.WeatherSubscriptionsComponent)
      },
      {
        path: 'stib',
        loadComponent: () => 
          import('./features/subscriptions/stib-subscriptions/stib-subscriptions.component')
            .then(m => m.StibSubscriptionsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => 
          import('./features/subscriptions/subscription-settings/subscription-settings.component')
            .then(m => m.SubscriptionSettingsComponent)
      }
    ]
  },
  {
    path: 'live-status',
    loadComponent: () => 
      import('./features/live-status/live-status.component').then(m => m.LiveStatusComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

