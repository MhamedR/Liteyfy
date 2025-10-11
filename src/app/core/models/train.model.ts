export interface TrainLine {
  id: string;
  name: string;
  number: string;
  type: TrainType;
  stations: string[];
}

export enum TrainType {
  IC = 'IC',        // InterCity
  L = 'L',          // Local
  S = 'S',          // S-train
  P = 'P',          // Peak hour train
  ICT = 'ICT',      // InterCity direct
  THALYS = 'THALYS',
  EUROSTAR = 'EUROSTAR'
}

export interface Station {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  standardname: string;
}

export interface TrainDelay {
  id: string;
  trainNumber: string;
  lineName: string;
  station: string;
  delayMinutes: number;
  scheduledTime: Date;
  estimatedTime: Date;
  reason?: string;
  cancelled: boolean;
  platformChange?: {
    original: string;
    new: string;
  };
}

export interface LiveTrainStatus {
  trainId: string;
  trainNumber: string;
  from: string;
  to: string;
  currentStation?: string;
  nextStation?: string;
  delay: number;
  cancelled: boolean;
  platform?: string;
  vehicleInfo?: string;
}

