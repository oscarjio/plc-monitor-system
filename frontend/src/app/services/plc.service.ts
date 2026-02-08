import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, retry } from 'rxjs/operators';
import { PLC, PLCStatus, PLCStats, PLCTag } from '../models/plc.model';
import { environment } from '../../environments/environment';

// Backend API response interfaces
interface BackendPLC {
  id: number;
  name: string;
  ipAddress: string;
  port: number;
  protocol: string;
  enabled: boolean;
  status: string;
  lastSeen: string;
  description?: string;
  tags?: BackendTag[];
}

interface BackendTag {
  id: number;
  device_id?: number;
  tag_name?: string;
  name?: string;
  address: string;
  dataType?: string;
  data_type?: string;
  unit?: string;
  minValue?: string;
  maxValue?: string;
  min_value?: string;
  max_value?: string;
  accessType?: string;
  access_type?: string;
  scanRate?: number;
  scan_rate_ms?: number;
  enabled: boolean;
}

interface BackendResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

interface BackendStats {
  devices: {
    total: number;
    enabled: number;
    disabled: number;
  };
  alarms: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unacknowledged: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PlcService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;
  
  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  // Error state
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();

  constructor() { }

  /**
   * Map backend PLC response to frontend PLC model
   */
  private mapBackendPLC(backend: BackendPLC): PLC {
    return {
      id: backend.id.toString(),
      name: backend.name,
      ipAddress: backend.ipAddress,
      port: backend.port,
      protocol: backend.protocol,
      status: this.mapStatus(backend.status, backend.enabled),
      lastSeen: backend.lastSeen ? new Date(backend.lastSeen) : undefined,
      model: this.getModelFromProtocol(backend.protocol),
      location: backend.description || undefined,
      tags: backend.tags?.map(t => this.mapBackendTag(t)) || []
    };
  }

  /**
   * Map backend tag to frontend tag model
   */
  private mapBackendTag(backend: BackendTag): PLCTag {
    return {
      id: backend.id.toString(),
      name: backend.name || backend.tag_name || '',
      address: backend.address,
      dataType: backend.dataType || backend.data_type || 'UNKNOWN',
      value: null, // Will be populated from real-time data
      quality: backend.enabled ? 'GOOD' : 'BAD',
      timestamp: new Date(),
      unit: backend.unit
    };
  }

  /**
   * Map backend status to frontend status enum
   */
  private mapStatus(backendStatus: string, enabled: boolean): PLCStatus {
    if (!enabled) {
      return PLCStatus.OFFLINE;
    }
    switch (backendStatus.toLowerCase()) {
      case 'online':
        return PLCStatus.ONLINE;
      case 'offline':
        return PLCStatus.OFFLINE;
      case 'error':
        return PLCStatus.ERROR;
      default:
        return PLCStatus.UNKNOWN;
    }
  }

  /**
   * Get model name from protocol
   */
  private getModelFromProtocol(protocol: string): string {
    switch (protocol.toUpperCase()) {
      case 'SLMP':
        return 'Mitsubishi FX5U';
      case 'MODBUSTCP':
        return 'Modbus TCP Device';
      default:
        return `${protocol} Device`;
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }
    
    console.error('PlcService Error:', errorMessage, error);
    this.errorSubject.next(errorMessage);
    
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Get all PLCs
   */
  getAllPLCs(): Observable<PLC[]> {
    this.setLoading(true);
    this.clearError();
    
    return this.http.get<BackendResponse<BackendPLC[]>>(`${this.API_URL}/plcs`).pipe(
      retry(2), // Retry failed requests twice
      map(response => response.data.map(plc => this.mapBackendPLC(plc))),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Get PLC by ID
   */
  getPLCById(id: string): Observable<PLC | undefined> {
    this.setLoading(true);
    this.clearError();
    
    return this.http.get<BackendResponse<BackendPLC>>(`${this.API_URL}/plcs/${id}`).pipe(
      retry(2),
      map(response => this.mapBackendPLC(response.data)),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        if (error.status === 404) {
          return of(undefined);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Get PLC statistics
   */
  getPLCStats(): Observable<PLCStats> {
    this.setLoading(true);
    this.clearError();
    
    return this.http.get<BackendResponse<BackendStats>>(`${this.API_URL}/stats`).pipe(
      retry(2),
      map(response => ({
        totalPLCs: response.data.devices.total,
        onlinePLCs: response.data.devices.enabled,
        offlinePLCs: response.data.devices.disabled,
        errorPLCs: 0 // Backend doesn't track error state separately yet
      })),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Create new PLC
   */
  createPLC(plc: Partial<PLC>): Observable<PLC> {
    this.setLoading(true);
    this.clearError();
    
    const payload = {
      name: plc.name,
      protocol: plc.protocol,
      ipAddress: plc.ipAddress,
      port: plc.port,
      enabled: true,
      description: plc.location || plc.model
    };
    
    return this.http.post<BackendResponse<BackendPLC>>(`${this.API_URL}/plcs`, payload).pipe(
      map(response => this.mapBackendPLC(response.data)),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Update PLC
   */
  updatePLC(id: string, data: Partial<PLC>): Observable<PLC> {
    this.setLoading(true);
    this.clearError();
    
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.protocol) payload.protocol = data.protocol;
    if (data.ipAddress) payload.ipAddress = data.ipAddress;
    if (data.port) payload.port = data.port;
    if (data.status === PLCStatus.OFFLINE) payload.enabled = false;
    if (data.status === PLCStatus.ONLINE) payload.enabled = true;
    if (data.location || data.model) {
      payload.description = data.location || data.model;
    }
    
    return this.http.put<BackendResponse<BackendPLC>>(`${this.API_URL}/plcs/${id}`, payload).pipe(
      map(response => this.mapBackendPLC(response.data)),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Delete PLC
   */
  deletePLC(id: string): Observable<void> {
    this.setLoading(true);
    this.clearError();
    
    return this.http.delete<BackendResponse<any>>(`${this.API_URL}/plcs/${id}`).pipe(
      map(() => void 0),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Test PLC connection
   */
  testConnection(plc: Partial<PLC>): Observable<boolean> {
    // This would call a test endpoint if available
    // For now, return optimistic result
    return of(true);
  }

  /**
   * Check backend health
   */
  checkBackendHealth(): Observable<boolean> {
    return this.http.get(`${environment.apiBaseUrl}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
