import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStats, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  stats: PLCStats | null = null;
  recentPLCs: PLC[] = [];
  PLCStatus = PLCStatus;

  constructor(private plcService: PlcService) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentPLCs();
  }

  loadStats(): void {
    this.plcService.getPLCStats().subscribe(stats => {
      this.stats = stats;
    });
  }

  loadRecentPLCs(): void {
    this.plcService.getAllPLCs().subscribe(plcs => {
      this.recentPLCs = plcs.slice(0, 5);
    });
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
