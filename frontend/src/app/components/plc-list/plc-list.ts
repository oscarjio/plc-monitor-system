import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-plc-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plc-list.html',
  styleUrl: './plc-list.scss',
})
export class PlcList implements OnInit {
  plcs: PLC[] = [];
  filteredPLCs: PLC[] = [];
  searchTerm: string = '';
  filterStatus: string = 'all';
  PLCStatus = PLCStatus;

  constructor(private plcService: PlcService) {}

  ngOnInit(): void {
    this.loadPLCs();
  }

  loadPLCs(): void {
    this.plcService.getAllPLCs().subscribe(plcs => {
      this.plcs = plcs;
      this.applyFilters();
    });
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
