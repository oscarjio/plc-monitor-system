import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStats, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  stats: PLCStats | null = null;
  recentPLCs: PLC[] = [];
  PLCStatus = PLCStatus;
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  backendConnected = false;
  
  private destroy$ = new Subject<void>();

  constructor(private plcService: PlcService) {}

  ngOnInit(): void {
    this.checkBackendConnection();
    this.loadStats();
    this.loadRecentPLCs();
    
    // Subscribe to loading state
    this.plcService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);
    
    // Subscribe to error state
    this.plcService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => this.error = error);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkBackendConnection(): void {
    this.plcService.checkBackendHealth()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        connected => {
          this.backendConnected = connected;
          if (!connected) {
            this.error = 'Backend server is not reachable. Make sure backend is running on http://localhost:3001';
          }
        }
      );
  }

  loadStats(): void {
    this.plcService.getPLCStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: stats => {
          this.stats = stats;
        },
        error: err => {
          console.error('Failed to load stats:', err);
        }
      });
  }

  loadRecentPLCs(): void {
    this.plcService.getAllPLCs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: plcs => {
          this.recentPLCs = plcs.slice(0, 5);
        },
        error: err => {
          console.error('Failed to load PLCs:', err);
        }
      });
  }

  retry(): void {
    this.plcService.clearError();
    this.error = null;
    this.loadStats();
    this.loadRecentPLCs();
  }

  getStatusClass(status: PLCStatus): string {
    switch (status) {
      case PLCStatus.ONLINE:
        return 'status-online';
      case PLCStatus.OFFLINE:
        return 'status-offline';
      case PLCStatus.ERROR:
        return 'status-error';
      default:
        return 'status-unknown';
    }
  }
}
