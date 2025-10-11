export interface UserSubscription {
  id?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  preferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  trainLines: TrainLineSubscription[];
  stations: StationSubscription[];
  weatherRegions: WeatherRegionSubscription[];
  stibLines: StibLineSubscription[];
  quietHours?: QuietHours;
}

export interface TrainLineSubscription {
  lineId: string;
  lineName: string;
  enabled: boolean;
  notifyDelays: boolean;
  notifyCancellations: boolean;
  minDelayMinutes: number; // Only notify if delay >= this value
}

export interface StationSubscription {
  stationId: string;
  stationName: string;
  enabled: boolean;
  notifyDepartures: boolean;
  notifyArrivals: boolean;
}

export interface WeatherRegionSubscription {
  regionId: string;
  regionName: string;
  enabled: boolean;
  alertTypes: WeatherAlertType[];
}

export enum WeatherAlertType {
  THUNDERSTORM = 'THUNDERSTORM',
  HEAVY_RAIN = 'HEAVY_RAIN',
  SNOW = 'SNOW',
  ICE = 'ICE',
  WIND = 'WIND',
  FOG = 'FOG',
  HEAT = 'HEAT',
  COLD = 'COLD'
}

export interface StibLineSubscription {
  lineId: string;
  lineName: string;
  lineType: 'METRO' | 'TRAM' | 'BUS';
  enabled: boolean;
  notifyDisruptions: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
  allowCritical: boolean; // Allow critical notifications during quiet hours
}

