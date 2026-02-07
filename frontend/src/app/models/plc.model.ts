export interface PLC {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  status: PLCStatus;
  lastSeen?: Date;
  model?: string;
  location?: string;
  tags?: PLCTag[];
}

export enum PLCStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

export interface PLCTag {
  id: string;
  name: string;
  address: string;
  dataType: string;
  value: any;
  quality: string;
  timestamp: Date;
  unit?: string;
}

export interface PLCStats {
  totalPLCs: number;
  onlinePLCs: number;
  offlinePLCs: number;
  errorPLCs: number;
}
