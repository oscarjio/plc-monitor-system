import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-plc-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plc-list.html',
  styleUrl: './plc-list.scss',
})
export class PlcList implements OnInit, OnDestroy {
  plcs: PLC[] = [];
  filteredPLCs: PLC[] = [];
  searchTerm: string = '';
  filterStatus: string = 'all';
  PLCStatus = PLCStatus;
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private plcService: PlcService) {}

  ngOnInit(): void {
    this.loadPLCs();
    
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

  loadPLCs(): void {
    this.plcService.getAllPLCs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: plcs => {
          this.plcs = plcs;
          this.applyFilters();
        },
        error: err => {
          console.error('Failed to load PLCs:', err);
        }
      });
  }

  retry(): void {
    this.plcService.clearError();
    this.error = null;
    this.loadPLCs();
  }

  applyFilters(): void {
    this.filteredPLCs = this.plcs.filter(plc => {
      const matchesSearch = plc.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                          plc.ipAddress.includes(this.searchTerm) ||
                          (plc.location?.toLowerCase() || '').includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.filterStatus === 'all' || plc.status === this.filterStatus;

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
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
