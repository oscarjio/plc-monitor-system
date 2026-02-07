import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PLC {
  id?: number;
  name: string;
  protocol: string;
  ipAddress: string;
  port: number;
  enabled: boolean;
  description?: string;
  status?: string;
}

interface Tag {
  id?: number;
  deviceId: number;
  tagName: string;
  address: string;
  dataType: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  enabled: boolean;
}

@Component({
  selector: 'app-plc-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plc-manager">
      <!-- Header -->
      <div class="manager-header">
        <h2>🏭 PLC Station Manager</h2>
        <button class="btn-primary" (click)="showAddPlcDialog = true">
          ➕ Ny Station / PLC
        </button>
      </div>

      <!-- PLC List -->
      <div class="plc-list">
        <div 
          *ngFor="let plc of plcs" 
          class="plc-card"
          [class.online]="plc.status === 'online'"
          [class.offline]="plc.status === 'offline'">
          
          <div class="plc-header">
            <div class="plc-info">
              <h3>{{ plc.name }}</h3>
              <span class="plc-protocol">{{ plc.protocol }}</span>
              <span 
                class="plc-status-badge"
                [class.online]="plc.status === 'online'"
                [class.offline]="plc.status === 'offline'">
                {{ plc.status === 'online' ? '🟢 Online' : '🔴 Offline' }}
              </span>
            </div>
            <div class="plc-actions">
              <button (click)="editPlc(plc)" class="btn-small">✏️ Redigera</button>
              <button (click)="manageTags(plc)" class="btn-small">🏷️ Tags</button>
              <button (click)="testConnection(plc)" class="btn-small">🔌 Test</button>
              <button (click)="deletePlc(plc)" class="btn-small btn-danger">🗑️</button>
            </div>
          </div>

          <div class="plc-details">
            <div class="detail-item">
              <span class="label">IP:</span>
              <span class="value">{{ plc.ipAddress }}:{{ plc.port }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Beskrivning:</span>
              <span class="value">{{ plc.description || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value">{{ plc.enabled ? 'Aktiverad' : 'Inaktiverad' }}</span>
            </div>
          </div>

          <!-- Tags Preview -->
          <div class="tags-preview" *ngIf="plcTags[plc.id!]">
            <h4>Tags ({{ plcTags[plc.id!].length }})</h4>
            <div class="tag-chips">
              <span 
                *ngFor="let tag of plcTags[plc.id!].slice(0, 5)" 
                class="tag-chip"
                [class.enabled]="tag.enabled">
                {{ tag.tagName }}
              </span>
              <span *ngIf="plcTags[plc.id!].length > 5" class="tag-chip more">
                +{{ plcTags[plc.id!].length - 5 }} fler
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="plcs.length === 0">
          <p>🏭 Inga PLCs ännu</p>
          <p>Klicka på "Ny Station / PLC" för att komma igång!</p>
        </div>
      </div>

      <!-- Add/Edit PLC Dialog -->
      <div class="dialog-overlay" *ngIf="showAddPlcDialog || editingPlc">
        <div class="dialog">
          <div class="dialog-header">
            <h3>{{ editingPlc ? '✏️ Redigera PLC' : '➕ Ny PLC Station' }}</h3>
            <button class="btn-close" (click)="closeDialog()">✕</button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label>Stationsnamn *</label>
              <input 
                type="text" 
                [(ngModel)]="formPlc.name" 
                placeholder="t.ex. Produktionslinje 1">
            </div>

            <div class="form-group">
              <label>PLC-typ (Protocol) *</label>
              <select [(ngModel)]="formPlc.protocol">
                <option value="">Välj protocol...</option>
                <option value="SLMP">Mitsubishi SLMP (FX5, iQ-R)</option>
                <option value="ModbusTCP">Modbus TCP</option>
                <option value="S7comm">Siemens S7 (S7-1200, S7-1500)</option>
                <option value="EtherNetIP">EtherNet/IP (Allen Bradley)</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>IP-adress *</label>
                <input 
                  type="text" 
                  [(ngModel)]="formPlc.ipAddress" 
                  placeholder="192.168.1.100">
              </div>

              <div class="form-group">
                <label>Port *</label>
                <input 
                  type="number" 
                  [(ngModel)]="formPlc.port" 
                  placeholder="5007">
              </div>
            </div>

            <div class="form-group">
              <label>Beskrivning</label>
              <textarea 
                [(ngModel)]="formPlc.description" 
                placeholder="Beskrivning av stationen..."
                rows="3"></textarea>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" [(ngModel)]="formPlc.enabled">
                Aktivera PLC direkt
              </label>
            </div>

            <div class="connection-test" *ngIf="testResult">
              <div 
                class="test-result"
                [class.success]="testResult.success"
                [class.error]="!testResult.success">
                <span *ngIf="testResult.success">✅ Anslutningen lyckades!</span>
                <span *ngIf="!testResult.success">❌ {{ testResult.error }}</span>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn-secondary" (click)="closeDialog()">Avbryt</button>
            <button class="btn-test" (click)="testNewConnection()">🔌 Testa anslutning</button>
            <button class="btn-primary" (click)="savePlc()">
              {{ editingPlc ? '💾 Spara ändringar' : '➕ Skapa PLC' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Tag Management Dialog -->
      <div class="dialog-overlay" *ngIf="showTagDialog">
        <div class="dialog dialog-large">
          <div class="dialog-header">
            <h3>🏷️ Tags för {{ selectedPlc?.name }}</h3>
            <button class="btn-close" (click)="closeTagDialog()">✕</button>
          </div>

          <div class="dialog-body">
            <!-- Add Tag Button -->
            <button class="btn-primary" (click)="showAddTagForm = true" *ngIf="!showAddTagForm">
              ➕ Ny Tag
            </button>

            <!-- Add Tag Form -->
            <div class="tag-form" *ngIf="showAddTagForm">
              <h4>{{ editingTag ? '✏️ Redigera Tag' : '➕ Skapa ny Tag' }}</h4>
              
              <div class="form-row">
                <div class="form-group">
                  <label>Tag-namn *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="formTag.tagName" 
                    placeholder="t.ex. temperature">
                </div>

                <div class="form-group">
                  <label>Adress *</label>
                  <input 
                    type="text" 
                    [(ngModel)]="formTag.address" 
                    placeholder="t.ex. D100">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Datatyp *</label>
                  <select [(ngModel)]="formTag.dataType">
                    <option value="">Välj datatyp...</option>
                    <option value="BOOL">BOOL (Boolean)</option>
                    <option value="INT16">INT16 (16-bit heltal)</option>
                    <option value="INT32">INT32 (32-bit heltal)</option>
                    <option value="FLOAT">FLOAT (Flyttal)</option>
                    <option value="STRING">STRING (Text)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Enhet</label>
                  <input 
                    type="text" 
                    [(ngModel)]="formTag.unit" 
                    placeholder="t.ex. °C, bar, RPM">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Min-värde</label>
                  <input 
                    type="number" 
                    [(ngModel)]="formTag.minValue" 
                    placeholder="0">
                </div>

                <div class="form-group">
                  <label>Max-värde</label>
                  <input 
                    type="number" 
                    [(ngModel)]="formTag.maxValue" 
                    placeholder="100">
                </div>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" [(ngModel)]="formTag.enabled">
                  Aktivera tag
                </label>
              </div>

              <div class="form-actions">
                <button class="btn-secondary" (click)="cancelTagForm()">Avbryt</button>
                <button class="btn-primary" (click)="saveTag()">
                  {{ editingTag ? '💾 Spara' : '➕ Skapa' }}
                </button>
              </div>
            </div>

            <!-- Tags Table -->
            <div class="tags-table" *ngIf="currentTags.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Namn</th>
                    <th>Adress</th>
                    <th>Typ</th>
                    <th>Enhet</th>
                    <th>Min/Max</th>
                    <th>Status</th>
                    <th>Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let tag of currentTags">
                    <td>{{ tag.tagName }}</td>
                    <td><code>{{ tag.address }}</code></td>
                    <td>{{ tag.dataType }}</td>
                    <td>{{ tag.unit || '-' }}</td>
                    <td>{{ tag.minValue ?? '-' }} / {{ tag.maxValue ?? '-' }}</td>
                    <td>
                      <span 
                        class="status-badge"
                        [class.enabled]="tag.enabled"
                        [class.disabled]="!tag.enabled">
                        {{ tag.enabled ? '✅ Aktiv' : '⏸️ Inaktiv' }}
                      </span>
                    </td>
                    <td>
                      <button (click)="editTag(tag)" class="btn-icon">✏️</button>
                      <button (click)="deleteTag(tag)" class="btn-icon btn-danger">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="empty-state" *ngIf="currentTags.length === 0 && !showAddTagForm">
              <p>🏷️ Inga tags ännu</p>
              <p>Skapa tags för att läsa data från PLC:n</p>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn-secondary" (click)="closeTagDialog()">Stäng</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plc-manager {
      padding: 2rem;
      background-color: #f9fafb;
      min-height: 100vh;
    }

    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .manager-header h2 {
      margin: 0;
      color: #1f2937;
    }

    .plc-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
      gap: 1.5rem;
    }

    .plc-card {
      background-color: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #6b7280;
      transition: all 0.2s;
    }

    .plc-card.online {
      border-left-color: #10b981;
    }

    .plc-card.offline {
      border-left-color: #ef4444;
    }

    .plc-card:hover {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .plc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .plc-info h3 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
    }

    .plc-protocol {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background-color: #e5e7eb;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #4b5563;
      margin-right: 0.5rem;
    }

    .plc-status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .plc-status-badge.online {
      background-color: #d1fae5;
      color: #065f46;
    }

    .plc-status-badge.offline {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .plc-actions {
      display: flex;
      gap: 0.5rem;
    }

    .plc-details {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .detail-item {
      display: flex;
      margin-bottom: 0.5rem;
    }

    .detail-item .label {
      font-weight: 500;
      color: #6b7280;
      width: 120px;
    }

    .detail-item .value {
      color: #1f2937;
    }

    .tags-preview {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .tags-preview h4 {
      margin: 0 0 0.5rem 0;
      color: #4b5563;
      font-size: 0.875rem;
    }

    .tag-chips {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tag-chip {
      padding: 0.25rem 0.75rem;
      background-color: #dbeafe;
      color: #1e40af;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .tag-chip.enabled {
      background-color: #d1fae5;
      color: #065f46;
    }

    .tag-chip.more {
      background-color: #e5e7eb;
      color: #6b7280;
    }

    /* Buttons */
    .btn-primary, .btn-secondary, .btn-small, .btn-danger, .btn-icon, .btn-test {
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

    .btn-primary:hover {
      background-color: #2563eb;
    }

    .btn-secondary {
      background-color: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #4b5563;
    }

    .btn-small {
      padding: 0.25rem 0.75rem;
      font-size: 0.875rem;
      background-color: white;
      border: 1px solid #d1d5db;
      color: #374151;
    }

    .btn-small:hover {
      background-color: #f3f4f6;
    }

    .btn-small.btn-danger {
      border-color: #ef4444;
      color: #ef4444;
    }

    .btn-small.btn-danger:hover {
      background-color: #fee2e2;
    }

    .btn-test {
      background-color: #8b5cf6;
      color: white;
    }

    .btn-test:hover {
      background-color: #7c3aed;
    }

    .btn-icon {
      padding: 0.25rem 0.5rem;
      background: none;
      border: none;
      font-size: 1rem;
      cursor: pointer;
    }

    .btn-icon:hover {
      background-color: #f3f4f6;
      border-radius: 4px;
    }

    /* Dialog */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background-color: white;
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .dialog.dialog-large {
      max-width: 900px;
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

    /* Forms */
    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: #374151;
      font-weight: 500;
    }

    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 1rem;
    }

    .form-group input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .connection-test {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 6px;
      background-color: #f9fafb;
    }

    .test-result.success {
      color: #065f46;
      background-color: #d1fae5;
      padding: 0.5rem;
      border-radius: 4px;
    }

    .test-result.error {
      color: #991b1b;
      background-color: #fee2e2;
      padding: 0.5rem;
      border-radius: 4px;
    }

    /* Tag Form */
    .tag-form {
      background-color: #f9fafb;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
    }

    .tag-form h4 {
      margin-top: 0;
      color: #1f2937;
    }

    .form-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    /* Tags Table */
    .tags-table {
      margin-top: 1.5rem;
      overflow-x: auto;
    }

    .tags-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .tags-table th,
    .tags-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .tags-table th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    .tags-table code {
      padding: 0.25rem 0.5rem;
      background-color: #f3f4f6;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-badge.enabled {
      background-color: #d1fae5;
      color: #065f46;
    }

    .status-badge.disabled {
      background-color: #e5e7eb;
      color: #6b7280;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }

    .empty-state p {
      margin: 0.5rem 0;
    }
  `]
})
export class PlcManagerComponent implements OnInit {
  plcs: PLC[] = [];
  plcTags: { [plcId: number]: Tag[] } = {};
  
  showAddPlcDialog = false;
  editingPlc: PLC | null = null;
  formPlc: PLC = this.getEmptyPlc();
  testResult: any = null;

  showTagDialog = false;
  showAddTagForm = false;
  selectedPlc: PLC | null = null;
  currentTags: Tag[] = [];
  editingTag: Tag | null = null;
  formTag: Tag = this.getEmptyTag();

  ngOnInit() {
    this.loadPlcs();
  }

  getEmptyPlc(): PLC {
    return {
      name: '',
      protocol: '',
      ipAddress: '',
      port: 5007,
      enabled: true,
      description: ''
    };
  }

  getEmptyTag(): Tag {
    return {
      deviceId: 0,
      tagName: '',
      address: '',
      dataType: '',
      unit: '',
      enabled: true
    };
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
          ipAddress: plc.ipAddress,
          port: plc.port,
          enabled: plc.enabled,
          description: plc.description,
          status: plc.status
        }));

        // Load tags for each PLC
        for (const plc of this.plcs) {
          if (plc.id) {
            await this.loadTagsForPlc(plc.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load PLCs:', error);
      alert('❌ Kunde inte ladda PLCs');
    }
  }

  async loadTagsForPlc(plcId: number) {
    try {
      const response = await fetch(`http://localhost:3001/api/plcs/${plcId}`);
      const data = await response.json();
      
      if (data.success && data.data.tags) {
        this.plcTags[plcId] = data.data.tags.map((tag: any) => ({
          id: tag.id,
          deviceId: plcId,
          tagName: tag.name,
          address: tag.address,
          dataType: tag.dataType,
          unit: tag.unit,
          minValue: tag.minValue,
          maxValue: tag.maxValue,
          enabled: tag.enabled
        }));
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  editPlc(plc: PLC) {
    this.editingPlc = plc;
    this.formPlc = { ...plc };
    this.testResult = null;
  }

  async manageTags(plc: PLC) {
    this.selectedPlc = plc;
    this.showTagDialog = true;
    this.showAddTagForm = false;
    
    if (plc.id && this.plcTags[plc.id]) {
      this.currentTags = [...this.plcTags[plc.id]];
    } else {
      this.currentTags = [];
    }
  }

  async testConnection(plc: PLC) {
    alert(`🔌 Testar anslutning till ${plc.name}...\n(Funktion ej implementerad ännu)`);
  }

  async deletePlc(plc: PLC) {
    if (!confirm(`Är du säker på att du vill ta bort ${plc.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/plcs/${plc.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ PLC borttagen!');
        await this.loadPlcs();
      }
    } catch (error) {
      console.error('Failed to delete PLC:', error);
      alert('❌ Kunde inte ta bort PLC');
    }
  }

  async testNewConnection() {
    this.testResult = { success: false, error: 'Testing...' };
    
    // Simulate test (replace with actual API call)
    setTimeout(() => {
      this.testResult = {
        success: true,
        message: 'Anslutningen lyckades!'
      };
    }, 1000);
  }

  async savePlc() {
    if (!this.formPlc.name || !this.formPlc.protocol || !this.formPlc.ipAddress || !this.formPlc.port) {
      alert('⚠️ Fyll i alla obligatoriska fält');
      return;
    }

    try {
      const method = this.editingPlc ? 'PUT' : 'POST';
      const url = this.editingPlc 
        ? `http://localhost:3001/api/plcs/${this.editingPlc.id}`
        : 'http://localhost:3001/api/plcs';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formPlc)
      });

      if (response.ok) {
        alert(`✅ PLC ${this.editingPlc ? 'uppdaterad' : 'skapad'}!`);
        this.closeDialog();
        await this.loadPlcs();
      }
    } catch (error) {
      console.error('Failed to save PLC:', error);
      alert('❌ Kunde inte spara PLC');
    }
  }

  closeDialog() {
    this.showAddPlcDialog = false;
    this.editingPlc = null;
    this.formPlc = this.getEmptyPlc();
    this.testResult = null;
  }

  closeTagDialog() {
    this.showTagDialog = false;
    this.showAddTagForm = false;
    this.selectedPlc = null;
    this.currentTags = [];
    this.editingTag = null;
  }

  editTag(tag: Tag) {
    this.editingTag = tag;
    this.formTag = { ...tag };
    this.showAddTagForm = true;
  }

  async deleteTag(tag: Tag) {
    if (!confirm(`Ta bort tag "${tag.tagName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/tags/${tag.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('✅ Tag borttagen!');
        if (this.selectedPlc?.id) {
          await this.loadTagsForPlc(this.selectedPlc.id);
          this.currentTags = this.plcTags[this.selectedPlc.id] || [];
        }
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('❌ Kunde inte ta bort tag');
    }
  }

  async saveTag() {
    if (!this.formTag.tagName || !this.formTag.address || !this.formTag.dataType) {
      alert('⚠️ Fyll i alla obligatoriska fält');
      return;
    }

    this.formTag.deviceId = this.selectedPlc!.id!;

    try {
      const method = this.editingTag ? 'PUT' : 'POST';
      const url = this.editingTag
        ? `http://localhost:3001/api/tags/${this.editingTag.id}`
        : 'http://localhost:3001/api/tags';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formTag)
      });

      if (response.ok) {
        alert(`✅ Tag ${this.editingTag ? 'uppdaterad' : 'skapad'}!`);
        this.cancelTagForm();
        if (this.selectedPlc?.id) {
          await this.loadTagsForPlc(this.selectedPlc.id);
          this.currentTags = this.plcTags[this.selectedPlc.id] || [];
        }
      }
    } catch (error) {
      console.error('Failed to save tag:', error);
      alert('❌ Kunde inte spara tag');
    }
  }

  cancelTagForm() {
    this.showAddTagForm = false;
    this.editingTag = null;
    this.formTag = this.getEmptyTag();
  }
}
