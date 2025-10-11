export interface WeatherRegion {
  id: string;
  name: string;
  province: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface WeatherAlert {
  id: string;
  regionId: string;
  regionName: string;
  type: string;
  severity: WeatherSeverity;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  issued: Date;
  source: 'KMI' | 'IRM';
}

export enum WeatherSeverity {
  GREEN = 'GREEN',       // No warning
  YELLOW = 'YELLOW',     // Be aware
  ORANGE = 'ORANGE',     // Be prepared
  RED = 'RED'            // Take action
}

export interface CurrentWeather {
  regionId: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  pressure: number;
  visibility: number;
  condition: string;
  timestamp: Date;
}

export interface WeatherForecast {
  regionId: string;
  date: Date;
  minTemperature: number;
  maxTemperature: number;
  precipitationProbability: number;
  precipitationAmount: number;
  windSpeed: number;
  condition: string;
  sunrise: Date;
  sunset: Date;
}

