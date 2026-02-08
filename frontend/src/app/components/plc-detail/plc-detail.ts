import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlcService } from '../../services/plc.service';
import { PLC, PLCStatus } from '../../models/plc.model';

@Component({
  selector: 'app-plc-detail',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './plc-detail.html',
  styleUrl: './plc-detail.scss',
})
export class PlcDetail implements OnInit {
  plc: PLC | null = null;
  PLCStatus = PLCStatus;
  showEditModal = false;
  editData: {
    name: string;
    ipAddress: string;
    port: number;
    protocol: string;
  } = {
    name: '',
    ipAddress: '',
    port: 502,
    protocol: 'modbus-tcp'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
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

  refreshPLC(): void {
    if (this.plc) {
      this.loadPLC(this.plc.id);
    }
  }

  openEditModal(): void {
    if (this.plc) {
      this.editData = {
        name: this.plc.name,
        ipAddress: this.plc.ipAddress,
        port: this.plc.port,
        protocol: this.plc.protocol || 'modbus-tcp'
      };
      this.showEditModal = true;
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  saveEdit(): void {
    if (!this.plc) return;

    this.plcService.updatePLC(this.plc.id, this.editData).subscribe({
      next: (updatedPLC) => {
        this.plc = updatedPLC;
        this.closeEditModal();
        console.log('PLC updated successfully');
      },
      error: (err) => {
        console.error('Failed to update PLC:', err);
        alert('Failed to update PLC. Please try again.');
      }
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
