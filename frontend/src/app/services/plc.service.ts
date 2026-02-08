import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PLC, PLCStatus, PLCStats } from '../models/plc.model';

@Injectable({
  providedIn: 'root'
})
export class PlcService {

  // Mock data - replace with real API calls later
  private mockPLCs: PLC[] = [
    {
      id: '1',
      name: 'PLC-001',
      ipAddress: '192.168.1.100',
      port: 502,
      protocol: 's7',
      status: PLCStatus.ONLINE,
      model: 'Siemens S7-1200',
      location: 'Production Line 1',
      lastSeen: new Date(),
      tags: [
        {
          id: 't1',
          name: 'Temperature',
          address: 'DB1.DBD0',
          dataType: 'REAL',
          value: 23.5,
          quality: 'GOOD',
          timestamp: new Date(),
          unit: '°C'
        },
        {
          id: 't2',
          name: 'Pressure',
          address: 'DB1.DBD4',
          dataType: 'REAL',
          value: 1.2,
          quality: 'GOOD',
          timestamp: new Date(),
          unit: 'bar'
        }
      ]
    },
    {
      id: '2',
      name: 'PLC-002',
      ipAddress: '192.168.1.101',
      port: 502,
      protocol: 'ethernet-ip',
      status: PLCStatus.ONLINE,
      model: 'Allen Bradley CompactLogix',
      location: 'Production Line 2',
      lastSeen: new Date()
    },
    {
      id: '3',
      name: 'PLC-003',
      ipAddress: '192.168.1.102',
      port: 502,
      protocol: 'modbus-tcp',
      status: PLCStatus.OFFLINE,
      model: 'Schneider Modicon M340',
      location: 'Warehouse',
      lastSeen: new Date(Date.now() - 300000) // 5 minutes ago
    },
    {
      id: '4',
      name: 'PLC-004',
      ipAddress: '192.168.1.103',
      port: 502,
      protocol: 's7',
      status: PLCStatus.ERROR,
      model: 'Siemens S7-1500',
      location: 'Quality Control',
      lastSeen: new Date(Date.now() - 60000) // 1 minute ago
    }
  ];

  constructor() { }

  getAllPLCs(): Observable<PLC[]> {
    return of(this.mockPLCs);
  }

  getPLCById(id: string): Observable<PLC | undefined> {
    const plc = this.mockPLCs.find(p => p.id === id);
    return of(plc);
  }

  getPLCStats(): Observable<PLCStats> {
    const stats: PLCStats = {
      totalPLCs: this.mockPLCs.length,
      onlinePLCs: this.mockPLCs.filter(p => p.status === PLCStatus.ONLINE).length,
      offlinePLCs: this.mockPLCs.filter(p => p.status === PLCStatus.OFFLINE).length,
      errorPLCs: this.mockPLCs.filter(p => p.status === PLCStatus.ERROR).length
    };
    return of(stats);
  }

  updatePLC(id: string, data: Partial<PLC>): Observable<PLC> {
    const index = this.mockPLCs.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockPLCs[index] = {
        ...this.mockPLCs[index],
        ...data
      };
      return of(this.mockPLCs[index]);
    }
    throw new Error('PLC not found');
  }
}
