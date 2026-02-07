import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';

interface Alarm {
  id: string;
  deviceId: string;
  name: string;
  message: string;
  alarmClass: 'A' | 'B' | 'C';
  className: string;
  color: string;
  bgColor: string;
  soundFile: string | null;
  soundVolume: number;
  uiStyle: {
    banner: boolean;
    popup: boolean;
    blink: boolean;
    size: 'small' | 'medium' | 'large';
  };
  timeTriggered: string;
  isActive: boolean;
  requiresAcknowledgement: boolean;
}

@Component({
  selector: 'app-alarm-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alarm-banner-container">
      <!-- A-Class Critical Alarms (Red Banner) -->
      <div 
        *ngFor="let alarm of criticalAlarms" 
        class="alarm-banner critical"
        [class.blink]="alarm.uiStyle.blink"
        [style.background-color]="alarm.bgColor"
        [style.border-left-color]="alarm.color">
        
        <div class="alarm-icon">
          <svg class="icon-large" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
        </div>

        <div class="alarm-content">
          <div class="alarm-header">
            <span class="alarm-class-badge critical">{{ alarm.className }}</span>
            <span class="alarm-device">{{ alarm.deviceId }}</span>
            <span class="alarm-time">{{ formatTime(alarm.timeTriggered) }}</span>
          </div>
          <div class="alarm-title">{{ alarm.name }}</div>
          <div class="alarm-message" *ngIf="alarm.message">{{ alarm.message }}</div>
        </div>

        <div class="alarm-actions">
          <button 
            class="btn-acknowledge"
            (click)="acknowledgeAlarm(alarm.id)"
            [style.background-color]="alarm.color">
            BEKRÄFTA
          </button>
          <button 
            class="btn-dismiss"
            (click)="dismissAlarm(alarm.id)">
            ✕
          </button>
        </div>
      </div>

      <!-- B-Class Warning Alarms (Yellow/Orange - No Banner, just notification area) -->
      <div class="warning-container" *ngIf="warningAlarms.length > 0">
        <div class="warning-summary" (click)="toggleWarnings()">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">
            {{ warningAlarms.length }} varning{{ warningAlarms.length > 1 ? 'ar' : '' }}
          </span>
          <span class="warning-toggle">{{ showWarnings ? '▼' : '▶' }}</span>
        </div>

        <div class="warning-list" *ngIf="showWarnings">
          <div 
            *ngFor="let alarm of warningAlarms" 
            class="alarm-item warning"
            [style.background-color]="alarm.bgColor"
            [style.border-left-color]="alarm.color">
            
            <div class="alarm-item-content">
              <span class="alarm-class-badge warning">{{ alarm.className }}</span>
              <span class="alarm-name">{{ alarm.name }}</span>
              <span class="alarm-time-small">{{ formatTime(alarm.timeTriggered) }}</span>
            </div>

            <button 
              class="btn-clear-small"
              (click)="clearAlarm(alarm.id)">
              ✓
            </button>
          </div>
        </div>
      </div>

      <!-- C-Class Info Alarms (Blue - Minimal display) -->
      <div class="info-container" *ngIf="infoAlarms.length > 0 && showInfo">
        <div *ngFor="let alarm of infoAlarms" class="alarm-item info">
          <span class="info-icon">ℹ️</span>
          <span class="alarm-name-small">{{ alarm.name }}</span>
          <button class="btn-close-tiny" (click)="clearAlarm(alarm.id)">✕</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alarm-banner-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      pointer-events: none;
    }

    .alarm-banner {
      pointer-events: all;
      padding: 1.5rem;
      margin: 0.5rem;
      border-radius: 8px;
      border-left: 6px solid;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 1rem;
      animation: slideDown 0.3s ease-out;
    }

    .alarm-banner.critical {
      background-color: #FEE2E2;
      border-left-color: #DC2626;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .blink {
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0.3; }
    }

    .alarm-icon {
      color: #DC2626;
      flex-shrink: 0;
    }

    .icon-large {
      width: 48px;
      height: 48px;
    }

    .alarm-content {
      flex: 1;
    }

    .alarm-header {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .alarm-class-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .alarm-class-badge.critical {
      background-color: #DC2626;
      color: white;
    }

    .alarm-class-badge.warning {
      background-color: #F59E0B;
      color: white;
    }

    .alarm-device {
      color: #666;
      font-weight: 500;
    }

    .alarm-time {
      color: #999;
      margin-left: auto;
    }

    .alarm-title {
      font-size: 1.25rem;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .alarm-message {
      color: #4b5563;
      font-size: 0.95rem;
    }

    .alarm-actions {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .btn-acknowledge {
      padding: 0.75rem 1.5rem;
      background-color: #DC2626;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-acknowledge:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .btn-dismiss {
      padding: 0.75rem 1rem;
      background-color: #6b7280;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-dismiss:hover {
      background-color: #4b5563;
    }

    /* Warning Container */
    .warning-container {
      pointer-events: all;
      margin: 0.5rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .warning-summary {
      padding: 1rem;
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
    }

    .warning-summary:hover {
      background-color: #FDE68A;
    }

    .warning-icon {
      font-size: 1.5rem;
    }

    .warning-text {
      flex: 1;
    }

    .warning-toggle {
      color: #666;
    }

    .warning-list {
      border-top: 1px solid #FDE68A;
    }

    .alarm-item {
      padding: 0.75rem 1rem;
      border-left: 3px solid;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background-color 0.2s;
    }

    .alarm-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .alarm-item.warning {
      background-color: #FFFBEB;
      border-left-color: #F59E0B;
    }

    .alarm-item-content {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex: 1;
    }

    .alarm-name {
      font-weight: 500;
      color: #1f2937;
    }

    .alarm-time-small {
      color: #999;
      font-size: 0.875rem;
      margin-left: auto;
    }

    .btn-clear-small {
      padding: 0.25rem 0.75rem;
      background-color: #10b981;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .btn-clear-small:hover {
      background-color: #059669;
    }

    /* Info Container */
    .info-container {
      pointer-events: all;
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      max-width: 300px;
    }

    .alarm-item.info {
      background-color: #DBEAFE;
      border-left-color: #3B82F6;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .info-icon {
      font-size: 1rem;
    }

    .alarm-name-small {
      flex: 1;
      color: #1e40af;
    }

    .btn-close-tiny {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 1rem;
      padding: 0;
    }

    .btn-close-tiny:hover {
      color: #1f2937;
    }
  `]
})
export class AlarmBannerComponent implements OnInit, OnDestroy {
  criticalAlarms: Alarm[] = [];
  warningAlarms: Alarm[] = [];
  infoAlarms: Alarm[] = [];
  
  showWarnings = false;
  showInfo = true;

  private audioContext: AudioContext | null = null;
  private refreshSubscription?: Subscription;

  ngOnInit() {
    this.loadAlarms();
    
    // Refresh every 5 seconds
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.loadAlarms();
    });

    // Initialize audio context
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
    }
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  async loadAlarms() {
    try {
      const response = await fetch('http://localhost:3001/api/alarms?active=true');
      const data = await response.json();
      
      if (data.success) {
        this.criticalAlarms = data.data.filter((a: Alarm) => a.alarmClass === 'A' && a.uiStyle.banner);
        this.warningAlarms = data.data.filter((a: Alarm) => a.alarmClass === 'B');
        this.infoAlarms = data.data.filter((a: Alarm) => a.alarmClass === 'C');

        // Play sound for new critical alarms
        this.criticalAlarms.forEach(alarm => {
          if (alarm.soundFile) {
            this.playAlarmSound(alarm.soundFile, alarm.soundVolume);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load alarms:', error);
    }
  }

  playAlarmSound(soundFile: string, volume: number) {
    // Placeholder for actual sound playback
    console.log(`🔊 Playing alarm sound: ${soundFile} at volume ${volume}`);
    // In production, load and play actual audio file
  }

  async acknowledgeAlarm(alarmId: string) {
    try {
      const response = await fetch(`http://localhost:3001/api/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current-user' })
      });

      if (response.ok) {
        await this.loadAlarms();
      }
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  }

  async clearAlarm(alarmId: string) {
    try {
      const response = await fetch(`http://localhost:3001/api/alarms/${alarmId}/clear`, {
        method: 'POST'
      });

      if (response.ok) {
        await this.loadAlarms();
      }
    } catch (error) {
      console.error('Failed to clear alarm:', error);
    }
  }

  dismissAlarm(alarmId: string) {
    // Temporarily hide from banner (will reappear on next refresh if still active)
    this.criticalAlarms = this.criticalAlarms.filter(a => a.id !== alarmId);
  }

  toggleWarnings() {
    this.showWarnings = !this.showWarnings;
  }

  formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
