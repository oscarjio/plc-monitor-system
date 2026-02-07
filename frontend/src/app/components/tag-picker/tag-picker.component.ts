import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PLC {
  id: number;
  name: string;
  protocol: string;
  status: string;
}

interface Tag {
  id: number;
  deviceId: number;
  name: string;
  address: string;
  dataType: string;
  unit?: string;
  currentValue?: any;
}

@Component({
  selector: 'app-tag-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tag-picker-overlay" *ngIf="isOpen">
      <div class="tag-picker-dialog">
        <div class="dialog-header">
          <h3>🏷️ Välj Tag från PLC</h3>
          <button class="btn-close" (click)="close()">✕</button>
        </div>

        <div class="dialog-body">
          <!-- PLC Selection -->
          <div class="form-group">
            <label>Välj PLC *</label>
            <select [(ngModel)]="selectedPlcId" (change)="loadTagsForPlc()">
              <option value="">Välj PLC...</option>
              <option *ngFor="let plc of plcs" [value]="plc.id">
                {{ plc.name }} ({{ plc.protocol }}) 
                <span *ngIf="plc.status === 'online'">🟢</span>
                <span *ngIf="plc.status === 'offline'">🔴</span>
              </option>
            </select>
          </div>

          <!-- Tag Selection -->
          <div class="form-group" *ngIf="selectedPlcId">
            <label>Välj befintlig tag</label>
            <select [(ngModel)]="selectedTagId" (change)="onTagSelected()">
              <option value="">-- Eller skapa ny tag nedan --</option>
              <option *ngFor="let tag of availableTags" [value]="tag.id">
                {{ tag.name }} ({{ tag.address }}) - {{ tag.dataType }}
                <span *ngIf="tag.currentValue !== undefined"> = {{ tag.currentValue }}</span>
              </option>
            </select>
          </div>

          <!-- Selected Tag Preview -->
          <div class="tag-preview" *ngIf="selectedTag">
            <h4>Vald tag:</h4>
            <div class="preview-details">
              <div><strong>Namn:</strong> {{ selectedTag.name }}</div>
              <div><strong>Adress:</strong> <code>{{ selectedTag.address }}</code></div>
              <div><strong>Datatyp:</strong> {{ selectedTag.dataType }}</div>
              <div *ngIf="selectedTag.unit"><strong>Enhet:</strong> {{ selectedTag.unit }}</div>
              <div *ngIf="selectedTag.currentValue !== undefined">
                <strong>Aktuellt värde:</strong> {{ selectedTag.currentValue }}
              </div>
            </div>
          </div>

          <!-- Create New Tag -->
          <div class="create-tag-section" *ngIf="selectedPlcId && !selectedTag">
            <h4>➕ Skapa ny tag</h4>
            
            <div class="form-group">
              <label>Tag-namn *</label>
              <input 
                type="text" 
                [(ngModel)]="newTag.name" 
                placeholder="t.ex. temperature">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Adress *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newTag.address" 
                  placeholder="t.ex. D100">
              </div>

              <div class="form-group">
                <label>Datatyp *</label>
                <select [(ngModel)]="newTag.dataType">
                  <option value="">Välj...</option>
                  <option value="BOOL">BOOL</option>
                  <option value="INT16">INT16</option>
                  <option value="INT32">INT32</option>
                  <option value="FLOAT">FLOAT</option>
                  <option value="STRING">STRING</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Enhet</label>
              <input 
                type="text" 
                [(ngModel)]="newTag.unit" 
                placeholder="t.ex. °C, bar, RPM">
            </div>

            <button 
              class="btn-primary" 
              (click)="createAndSelectTag()"
              [disabled]="!canCreateTag()">
              ➕ Skapa och välj tag
            </button>
          </div>

          <!-- No PLCs Warning -->
          <div class="warning-box" *ngIf="plcs.length === 0">
            <p>⚠️ Inga PLCs hittades</p>
            <p>Gå till <strong>PLC Manager</strong> för att lägga till en PLC först.</p>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-secondary" (click)="close()">Avbryt</button>
          <button 
            class="btn-primary" 
            (click)="confirm()"
            [disabled]="!selectedTag">
            ✅ Välj denna tag
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tag-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .tag-picker-dialog {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .dialog-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-header h3 {
      margin: 0;
      color: #1f2937;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 30px;
      height: 30px;
    }

    .btn-close:hover {
      color: #1f2937;
    }

    .dialog-body {
      padding: 1.5rem;
    }

    .dialog-footer {
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #374151;
      font-weight: 500;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .tag-preview {
      background-color: #f3f4f6;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .tag-preview h4 {
      margin-top: 0;
      color: #1f2937;
    }

    .preview-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      color: #4b5563;
    }

    .preview-details code {
      background-color: #e5e7eb;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
    }

    .create-tag-section {
      background-color: #eff6ff;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1.5rem;
    }

    .create-tag-section h4 {
      margin-top: 0;
      color: #1e40af;
    }

    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }

    .warning-box p {
      margin: 0.5rem 0;
      color: #92400e;
    }

    .btn-primary, .btn-secondary {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .btn-primary:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background-color: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #4b5563;
    }
  `]
})
export class TagPickerComponent implements OnInit {
  @Input() isOpen = false;
  @Output() tagSelected = new EventEmitter<Tag>();
  @Output() closed = new EventEmitter<void>();

  plcs: PLC[] = [];
  availableTags: Tag[] = [];
  selectedPlcId: string = '';
  selectedTagId: string = '';
  selectedTag: Tag | null = null;
  
  newTag = {
    name: '',
    address: '',
    dataType: '',
    unit: ''
  };

  ngOnInit() {
    this.loadPlcs();
  }

  async loadPlcs() {
    try {
      const response = await fetch('http://localhost:3001/api/plcs');
      const data = await response.json();
      
      if (data.success) {
        this.plcs = data.data.map((plc: any) => ({
          id: plc.id,
          name: plc.name,
          protocol: plc.protocol,
          status: plc.status
        }));
      }
    } catch (error) {
      console.error('Failed to load PLCs:', error);
    }
  }

  async loadTagsForPlc() {
    if (!this.selectedPlcId) {
      this.availableTags = [];
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tags?deviceId=${this.selectedPlcId}`);
      const data = await response.json();
      
      if (data.success) {
        this.availableTags = data.data.map((tag: any) => ({
          id: tag.id,
          deviceId: tag.deviceId,
          name: tag.name,
          address: tag.address,
          dataType: tag.dataType,
          unit: tag.unit,
          currentValue: tag.currentValue
        }));
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  onTagSelected() {
    if (!this.selectedTagId) {
      this.selectedTag = null;
      return;
    }

    this.selectedTag = this.availableTags.find(t => t.id.toString() === this.selectedTagId) || null;
  }

  canCreateTag(): boolean {
    return !!(this.newTag.name && this.newTag.address && this.newTag.dataType);
  }

  async createAndSelectTag() {
    if (!this.canCreateTag()) {
      alert('⚠️ Fyll i alla obligatoriska fält');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: this.selectedPlcId,
          tagName: this.newTag.name,
          address: this.newTag.address,
          dataType: this.newTag.dataType,
          unit: this.newTag.unit || null,
          enabled: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.selectedTag = {
          id: data.data.id,
          deviceId: data.data.deviceId,
          name: data.data.name,
          address: data.data.address,
          dataType: data.data.dataType,
          unit: data.data.unit
        };
        
        alert('✅ Tag skapad!');
        await this.loadTagsForPlc();
      } else {
        const error = await response.json();
        alert(`❌ Fel: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('❌ Kunde inte skapa tag');
    }
  }

  confirm() {
    if (this.selectedTag) {
      this.tagSelected.emit(this.selectedTag);
      this.close();
    }
  }

  close() {
    this.selectedPlcId = '';
    this.selectedTagId = '';
    this.selectedTag = null;
    this.newTag = { name: '', address: '', dataType: '', unit: '' };
    this.closed.emit();
  }
}
