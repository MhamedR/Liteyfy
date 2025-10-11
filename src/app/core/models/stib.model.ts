export interface StibLine {
  id: string;
  name: string;
  number: string;
  type: StibLineType;
  color?: string;
  stops: string[];
}

export enum StibLineType {
  METRO = 'METRO',
  TRAM = 'TRAM',
  BUS = 'BUS'
}

export interface StibStop {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  lines: string[];
}

export interface StibDisruption {
  id: string;
  lineId: string;
  lineName: string;
  lineType: StibLineType;
  severity: DisruptionSeverity;
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  affectedStops?: string[];
}

export enum DisruptionSeverity {
  INFO = 'INFO',
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

export interface LiveVehiclePosition {
  vehicleId: string;
  lineId: string;
  direction: string;
  nextStop: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  delay: number;
  timestamp: Date;
}

