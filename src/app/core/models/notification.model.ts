export enum NotificationType {
  TRAIN_DELAY = 'TRAIN_DELAY',
  TRAIN_CANCELLATION = 'TRAIN_CANCELLATION',
  WEATHER_ALERT = 'WEATHER_ALERT',
  STIB_DISRUPTION = 'STIB_DISRUPTION',
  PLATFORM_CHANGE = 'PLATFORM_CHANGE'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: any;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  iconUrl?: string;
}

export interface PushNotificationPayload {
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    requireInteraction?: boolean;
  };
  data?: any;
}

