import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-plc-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './plc-detail.html',
  styleUrl: './plc-detail.scss',
})
export class PlcDetail implements OnInit {
  plc: PLC | null = null;
  PLCStatus = PLCStatus;

  constructor(
    private route: ActivatedRoute,
    private plcService: PlcService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.loadPLC(id);
    });
  }

  loadPLC(id: string): void {
    this.plcService.getPLCById(id).subscribe(plc => {
      this.plc = plc || null;
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

  getStatusIcon(status: PLCStatus): string {
    switch (status) {
      case PLCStatus.ONLINE:
        return '✅';
      case PLCStatus.OFFLINE:
        return '⭕';
      case PLCStatus.ERROR:
        return '⚠️';
      default:
        return '❓';
    }
  }
}
