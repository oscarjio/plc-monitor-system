import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface TimeSeriesData {
  time: string;
  deviceId: string;
  tagName: string;
  value: number;
  quality: number;
}

interface TagData {
  tagName: string;
  data: TimeSeriesData[];
  color: string;
  visible: boolean;
}

@Component({
  selector: 'app-plc-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plc-history">
      <!-- Header -->
      <div class="history-header">
        <h2>📊 PLC Historik & Grafer</h2>
        
        <div class="device-selector">
          <select [(ngModel)]="selectedDeviceId" (change)="loadDeviceData()">
            <option value="">Välj PLC...</option>
            <option *ngFor="let device of devices" [value]="device.id">
              {{ device.name }} ({{ device.id }})
            </option>
          </select>
        </div>
      </div>

      <div class="history-content" *ngIf="selectedDeviceId">
        <!-- Time Range Selector -->
        <div class="controls-bar">
          <div class="time-range-selector">
            <button 
              *ngFor="let range of timeRanges" 
              [class.active]="selectedTimeRange === range.value"
              (click)="setTimeRange(range.value)">
              {{ range.label }}
            </button>
          </div>

          <div class="refresh-controls">
            <label>
              <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()">
              Auto-uppdatera
            </label>
            <button (click)="loadDeviceData()" class="btn-refresh">
              🔄 Uppdatera
            </button>
          </div>
        </div>

        <!-- Tag Selection -->
        <div class="tag-selector" *ngIf="tagDataList.length > 0">
          <h3>Välj Tags att visa:</h3>
          <div class="tag-checkboxes">
            <label *ngFor="let tagData of tagDataList" class="tag-checkbox">
              <input 
                type="checkbox" 
                [(ngModel)]="tagData.visible" 
                (change)="updateChart()">
              <span [style.color]="tagData.color">●</span>
              {{ tagData.tagName }}
              <span class="tag-count">({{ tagData.data.length }} punkter)</span>
            </label>
          </div>
        </div>

        <!-- Chart Container -->
        <div class="chart-container">
          <canvas #chartCanvas></canvas>
        </div>

        <!-- Statistics Table -->
        <div class="statistics-table" *ngIf="tagDataList.length > 0">
          <h3>Statistik</h3>
          <table>
            <thead>
              <tr>
                <th>Tag</th>
                <th>Min</th>
                <th>Max</th>
                <th>Medel</th>
                <th>Senaste</th>
                <th>Datapunkter</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tagData of tagDataList" [class.hidden]="!tagData.visible">
                <td>
                  <span [style.color]="tagData.color">●</span>
                  {{ tagData.tagName }}
                </td>
                <td>{{ getMin(tagData.data) | number:'1.2-2' }}</td>
                <td>{{ getMax(tagData.data) | number:'1.2-2' }}</td>
                <td>{{ getAverage(tagData.data) | number:'1.2-2' }}</td>
                <td>{{ getLatest(tagData.data) | number:'1.2-2' }}</td>
                <td>{{ tagData.data.length }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Data Table (Raw Data) -->
        <div class="data-table-section">
          <h3>
            Rådata 
            <button (click)="exportToCSV()" class="btn-export">📥 Exportera CSV</button>
          </h3>
          
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tid</th>
                  <th>Tag</th>
                  <th>Värde</th>
                  <th>Kvalitet</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let point of getAllDataPoints().slice(0, 100)">
                  <td>{{ formatTime(point.time) }}</td>
                  <td>{{ point.tagName }}</td>
                  <td>{{ point.value | number:'1.2-2' }}</td>
                  <td>
                    <span 
                      class="quality-badge" 
                      [class.good]="point.quality === 0"
                      [class.bad]="point.quality !== 0">
                      {{ point.quality === 0 ? 'OK' : 'BAD' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p class="showing-count">
            Visar {{ Math.min(100, getAllDataPoints().length) }} av {{ getAllDataPoints().length }} datapunkter
          </p>
        </div>
      </div>

      <!-- No Data Message -->
      <div class="no-data" *ngIf="selectedDeviceId && tagDataList.length === 0">
        <p>⚠️ Ingen historik-data hittades för denna PLC.</p>
        <p>Data samlas in var 30:e minut. Vänta tills första insamlingen är klar.</p>
      </div>
    </div>
  `,
  styles: [`
    .plc-history {
      padding: 2rem;
      background-color: #f9fafb;
      min-height: 100vh;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .history-header h2 {
      margin: 0;
      color: #1f2937;
    }

    .device-selector select {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      background-color: white;
    }

    .controls-bar {
      background-color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .time-range-selector {
      display: flex;
      gap: 0.5rem;
    }

    .time-range-selector button {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      background-color: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .time-range-selector button:hover {
      background-color: #f3f4f6;
    }

    .time-range-selector button.active {
      background-color: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }

    .refresh-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .btn-refresh {
      padding: 0.5rem 1rem;
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background-color: #059669;
    }

    .tag-selector {
      background-color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .tag-selector h3 {
      margin-top: 0;
      color: #1f2937;
    }

    .tag-checkboxes {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .tag-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .tag-checkbox input {
      cursor: pointer;
    }

    .tag-count {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .chart-container {
      background-color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      height: 500px;
    }

    .chart-container canvas {
      max-height: 450px;
    }

    .statistics-table {
      background-color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .statistics-table h3 {
      margin-top: 0;
      color: #1f2937;
    }

    .statistics-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .statistics-table th,
    .statistics-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .statistics-table th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    .statistics-table tr.hidden {
      opacity: 0.3;
    }

    .data-table-section {
      background-color: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .data-table-section h3 {
      margin-top: 0;
      color: #1f2937;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-export {
      padding: 0.5rem 1rem;
      background-color: #6b7280;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .btn-export:hover {
      background-color: #4b5563;
    }

    .data-table-wrapper {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 0.5rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.875rem;
    }

    .data-table th {
      background-color: #f9fafb;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .quality-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
    }

    .quality-badge.good {
      background-color: #d1fae5;
      color: #065f46;
    }

    .quality-badge.bad {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .showing-count {
      margin-top: 0.5rem;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .no-data {
      background-color: white;
      padding: 3rem;
      border-radius: 8px;
      text-align: center;
      color: #6b7280;
    }

    .no-data p {
      margin: 0.5rem 0;
    }
  `]
})
export class PlcHistoryComponent implements OnInit {
  @ViewChild('chartCanvas') chartCanvas: any;
  
  chart: Chart | null = null;
  devices: any[] = [];
  selectedDeviceId: string = '';
  tagDataList: TagData[] = [];
  selectedTimeRange: string = '1h';
  autoRefresh: boolean = false;
  private refreshInterval: any;

  Math = Math;

  timeRanges = [
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' }
  ];

  colors = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.loadDevices();
    
    // Check if device ID from route params
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.selectedDeviceId = params['id'];
        this.loadDeviceData();
      }
    });
  }

  async loadDevices() {
    try {
      const response = await fetch('http://localhost:3001/api/plcs');
      const data = await response.json();
      
      if (data.success) {
        this.devices = data.data;
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  }

  async loadDeviceData() {
    if (!this.selectedDeviceId) return;

    try {
      const limit = this.getLimit();
      const response = await fetch(
        `http://localhost:3001/api/plcs/${this.selectedDeviceId}/data?limit=${limit}`
      );
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        this.processTimeSeriesData(data.data);
        this.updateChart();
      } else {
        this.tagDataList = [];
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
      }
    } catch (error) {
      console.error('Failed to load device data:', error);
    }
  }

  getLimit(): number {
    const limits: any = {
      '1h': 60,
      '6h': 360,
      '24h': 1440,
      '7d': 10080,
      '30d': 43200
    };
    return limits[this.selectedTimeRange] || 100;
  }

  processTimeSeriesData(rawData: TimeSeriesData[]) {
    // Group by tag name
    const grouped: { [key: string]: TimeSeriesData[] } = {};
    
    rawData.forEach(point => {
      if (!grouped[point.tagName]) {
        grouped[point.tagName] = [];
      }
      grouped[point.tagName].push(point);
    });

    // Create TagData objects
    this.tagDataList = Object.keys(grouped).map((tagName, index) => ({
      tagName,
      data: grouped[tagName].sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      ),
      color: this.colors[index % this.colors.length],
      visible: true
    }));
  }

  updateChart() {
    if (!this.chartCanvas) return;

    const visibleTags = this.tagDataList.filter(t => t.visible);

    if (visibleTags.length === 0) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      return;
    }

    const datasets = visibleTags.map(tagData => ({
      label: tagData.tagName,
      data: tagData.data.map(point => ({
        x: new Date(point.time).getTime(),
        y: point.value
      })),
      borderColor: tagData.color,
      backgroundColor: tagData.color + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.4
    }));

    const config: ChartConfiguration = {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              tooltipFormat: 'yyyy-MM-dd HH:mm:ss'
            },
            title: {
              display: true,
              text: 'Tid'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Värde'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    };

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(
      this.chartCanvas.nativeElement,
      config
    );
  }

  setTimeRange(range: string) {
    this.selectedTimeRange = range;
    this.loadDeviceData();
  }

  toggleAutoRefresh() {
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.loadDeviceData();
      }, 30000); // 30 seconds
    } else {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    }
  }

  getMin(data: TimeSeriesData[]): number {
    return Math.min(...data.map(d => d.value));
  }

  getMax(data: TimeSeriesData[]): number {
    return Math.max(...data.map(d => d.value));
  }

  getAverage(data: TimeSeriesData[]): number {
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return sum / data.length;
  }

  getLatest(data: TimeSeriesData[]): number {
    return data[data.length - 1]?.value || 0;
  }

  getAllDataPoints(): TimeSeriesData[] {
    return this.tagDataList
      .flatMap(t => t.data)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('sv-SE');
  }

  exportToCSV() {
    const data = this.getAllDataPoints();
    const csv = [
      ['Tid', 'Tag', 'Värde', 'Kvalitet'].join(','),
      ...data.map(point => [
        point.time,
        point.tagName,
        point.value,
        point.quality === 0 ? 'OK' : 'BAD'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plc-data-${this.selectedDeviceId}-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
