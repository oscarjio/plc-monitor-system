import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ScadaElement {
  id: string;
  type: 'tank' | 'pump' | 'valve' | 'gauge' | 'pipe' | 'label' | 'button';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  config: {
    label?: string;
    tagBinding?: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;
    color?: string;
    fillLevel?: number; // 0-100% for tanks
    isRunning?: boolean; // for pumps
    isOpen?: boolean; // for valves
    buttonAction?: 'ON/OFF' | 'Start/Stop' | 'Reset'; // for buttons
    isPressed?: boolean; // for buttons
  };
}

interface View {
  id: string;
  name: string;
  description: string;
  elements: ScadaElement[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-view-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="view-builder">
      <!-- Toolbar -->
      <div class="toolbar">
        <h2>🎨 SCADA View Builder</h2>
        
        <div class="toolbar-actions">
          <input 
            type="text" 
            [(ngModel)]="currentView.name" 
            placeholder="View name"
            class="view-name-input">
          
          <button (click)="saveView()" class="btn-primary">
            💾 Spara View
          </button>
          
          <button (click)="loadViews()" class="btn-secondary">
            📂 Ladda View
          </button>
          
          <button (click)="clearCanvas()" class="btn-danger">
            🗑️ Rensa
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="content-wrapper">
        <!-- Component Palette -->
        <div class="component-palette">
          <h3>Komponenter</h3>
          
          <div class="component-category">
            <h4>Behållare</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'tank')">
              <div class="component-preview tank-preview"></div>
              <span>Tank</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Pumpar & Motorer</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'pump')">
              <div class="component-preview pump-preview"></div>
              <span>Pump</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Ventiler</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'valve')">
              <div class="component-preview valve-preview"></div>
              <span>Ventil</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Instrument</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'gauge')">
              <div class="component-preview gauge-preview"></div>
              <span>Mätare</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Rör & Ledningar</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'pipe')">
              <div class="component-preview pipe-preview"></div>
              <span>Rör</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Text & Etiketter</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'label')">
              <div class="component-preview label-preview">T</div>
              <span>Etikett</span>
            </div>
          </div>

          <div class="component-category">
            <h4>Kontroller</h4>
            <div 
              class="component-item"
              draggable="true"
              (dragstart)="onDragStart($event, 'button')">
              <div class="component-preview button-preview">ON</div>
              <span>Knapp</span>
            </div>
          </div>
        </div>

        <!-- Canvas -->
        <div class="canvas-wrapper">
          <div 
            #canvas
            class="canvas"
            (drop)="onDrop($event)"
            (dragover)="onDragOver($event)"
            (click)="deselectAll()">
            
            <!-- Grid Background -->
            <svg class="grid-background" width="100%" height="100%">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" stroke-width="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <!-- Elements -->
            <div 
              *ngFor="let element of currentView.elements"
              class="scada-element"
              [class.selected]="selectedElement?.id === element.id"
              [style.left.px]="element.x"
              [style.top.px]="element.y"
              [style.width.px]="element.width"
              [style.height.px]="element.height"
              [style.transform]="'rotate(' + element.rotation + 'deg)'"
              (click)="selectElement($event, element)"
              (mousedown)="startDrag($event, element)">
              
              <!-- Tank -->
              <svg *ngIf="element.type === 'tank'" viewBox="0 0 100 150" class="tank-svg">
                <rect x="10" y="20" width="80" height="110" 
                      [attr.fill]="element.config.color || '#e5e7eb'" 
                      stroke="#374151" stroke-width="2"/>
                
                <!-- Fill Level -->
                <rect x="10" 
                      [attr.y]="130 - (element.config.fillLevel || 0) * 1.1" 
                      width="80" 
                      [attr.height]="(element.config.fillLevel || 0) * 1.1"
                      fill="#3b82f6" opacity="0.6"/>
                
                <!-- Top Cap -->
                <ellipse cx="50" cy="20" rx="40" ry="10" 
                         [attr.fill]="element.config.color || '#e5e7eb'" 
                         stroke="#374151" stroke-width="2"/>
                
                <!-- Label -->
                <text x="50" y="145" text-anchor="middle" font-size="10" fill="#374151">
                  {{ element.config.label || 'Tank' }}
                </text>
              </svg>

              <!-- Pump -->
              <svg *ngIf="element.type === 'pump'" viewBox="0 0 100 80" class="pump-svg">
                <circle cx="50" cy="40" r="30" 
                        [attr.fill]="element.config.isRunning ? '#10b981' : '#6b7280'" 
                        stroke="#374151" stroke-width="2"/>
                
                <!-- Rotation indicator -->
                <g *ngIf="element.config.isRunning" class="pump-rotation">
                  <line x1="50" y1="40" x2="50" y2="20" stroke="#ffffff" stroke-width="3"/>
                  <line x1="50" y1="40" x2="70" y2="40" stroke="#ffffff" stroke-width="3"/>
                </g>
                
                <text x="50" y="75" text-anchor="middle" font-size="10" fill="#374151">
                  {{ element.config.label || 'Pump' }}
                </text>
              </svg>

              <!-- Valve -->
              <svg *ngIf="element.type === 'valve'" viewBox="0 0 80 80" class="valve-svg">
                <rect x="35" y="10" width="10" height="60" 
                      [attr.fill]="element.config.isOpen ? '#10b981' : '#ef4444'" 
                      stroke="#374151" stroke-width="2"/>
                
                <polygon points="20,40 60,20 60,60" 
                         [attr.fill]="element.config.isOpen ? '#10b981' : '#ef4444'" 
                         opacity="0.6" stroke="#374151" stroke-width="2"/>
                
                <text x="40" y="75" text-anchor="middle" font-size="10" fill="#374151">
                  {{ element.config.label || 'Ventil' }}
                </text>
              </svg>

              <!-- Gauge -->
              <svg *ngIf="element.type === 'gauge'" viewBox="0 0 120 100" class="gauge-svg">
                <!-- Gauge Arc -->
                <path d="M 20 80 A 40 40 0 0 1 100 80" 
                      fill="none" stroke="#e5e7eb" stroke-width="8"/>
                
                <!-- Value Arc -->
                <path [attr.d]="getGaugeArc(element)" 
                      fill="none" stroke="#3b82f6" stroke-width="8"/>
                
                <!-- Center Circle -->
                <circle cx="60" cy="80" r="5" fill="#374151"/>
                
                <!-- Value Text -->
                <text x="60" y="60" text-anchor="middle" font-size="16" font-weight="bold" fill="#374151">
                  {{ element.config.fillLevel || 0 }}
                </text>
                <text x="60" y="72" text-anchor="middle" font-size="10" fill="#6b7280">
                  {{ element.config.unit || '%' }}
                </text>
                
                <text x="60" y="95" text-anchor="middle" font-size="10" fill="#374151">
                  {{ element.config.label || 'Gauge' }}
                </text>
              </svg>

              <!-- Pipe -->
              <svg *ngIf="element.type === 'pipe'" viewBox="0 0 100 20" class="pipe-svg">
                <rect x="0" y="5" width="100" height="10" 
                      fill="#9ca3af" stroke="#374151" stroke-width="2"/>
              </svg>

              <!-- Label -->
              <div *ngIf="element.type === 'label'" class="label-element">
                {{ element.config.label || 'Label' }}
              </div>

              <!-- Button -->
              <div *ngIf="element.type === 'button'" 
                   class="button-element"
                   [class.pressed]="element.config.isPressed"
                   (click)="onButtonClick($event, element)">
                <span class="button-text">
                  {{ element.config.label || element.config.buttonAction || 'Button' }}
                </span>
              </div>

              <!-- Resize Handles -->
              <div *ngIf="selectedElement?.id === element.id" class="resize-handles">
                <div class="resize-handle nw"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle se"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Properties Panel -->
        <div class="properties-panel" *ngIf="selectedElement">
          <h3>Egenskaper</h3>
          
          <div class="property-group">
            <label>Typ</label>
            <input type="text" [value]="selectedElement.type" disabled>
          </div>

          <div class="property-group">
            <label>Etikett</label>
            <input 
              type="text" 
              [(ngModel)]="selectedElement.config.label" 
              placeholder="Namn">
          </div>

          <div class="property-group">
            <label>Tag-bindning (PLC)</label>
            <input 
              type="text" 
              [(ngModel)]="selectedElement.config.tagBinding" 
              placeholder="t.ex. D100">
          </div>

          <div class="property-group" *ngIf="selectedElement.type === 'tank' || selectedElement.type === 'gauge'">
            <label>Värde (%)</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.config.fillLevel" 
              min="0" max="100">
          </div>

          <div class="property-group" *ngIf="selectedElement.type === 'pump'">
            <label>
              <input 
                type="checkbox" 
                [(ngModel)]="selectedElement.config.isRunning">
              Körs
            </label>
          </div>

          <div class="property-group" *ngIf="selectedElement.type === 'valve'">
            <label>
              <input 
                type="checkbox" 
                [(ngModel)]="selectedElement.config.isOpen">
              Öppen
            </label>
          </div>

          <div class="property-group" *ngIf="selectedElement.type === 'button'">
            <label>Åtgärd</label>
            <select [(ngModel)]="selectedElement.config.buttonAction">
              <option value="ON/OFF">ON/OFF</option>
              <option value="Start/Stop">Start/Stop</option>
              <option value="Reset">Reset</option>
            </select>
          </div>

          <div class="property-group">
            <label>Färg</label>
            <input 
              type="color" 
              [(ngModel)]="selectedElement.config.color">
          </div>

          <div class="property-group">
            <label>Position X</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.x">
          </div>

          <div class="property-group">
            <label>Position Y</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.y">
          </div>

          <div class="property-group">
            <label>Bredd</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.width">
          </div>

          <div class="property-group">
            <label>Höjd</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.height">
          </div>

          <div class="property-group">
            <label>Rotation (°)</label>
            <input 
              type="number" 
              [(ngModel)]="selectedElement.rotation" 
              min="0" max="360">
          </div>

          <div class="property-actions">
            <button (click)="deleteElement()" class="btn-danger">
              🗑️ Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .view-builder {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f9fafb;
    }

    .toolbar {
      background-color: white;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .toolbar h2 {
      margin: 0;
      color: #1f2937;
    }

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;
    }

    .view-name-input {
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }

    .btn-primary, .btn-secondary, .btn-danger {
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

    .btn-danger {
      background-color: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background-color: #dc2626;
    }

    .content-wrapper {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Component Palette */
    .component-palette {
      width: 200px;
      background-color: white;
      border-right: 1px solid #e5e7eb;
      padding: 1rem;
      overflow-y: auto;
    }

    .component-palette h3 {
      margin-top: 0;
      color: #1f2937;
      font-size: 1rem;
    }

    .component-category {
      margin-bottom: 1.5rem;
    }

    .component-category h4 {
      margin: 0 0 0.5rem 0;
      color: #6b7280;
      font-size: 0.875rem;
      text-transform: uppercase;
    }

    .component-item {
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 0.5rem;
      cursor: move;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .component-item:hover {
      background-color: #f3f4f6;
      border-color: #3b82f6;
    }

    .component-preview {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tank-preview {
      background: linear-gradient(to bottom, #e5e7eb 0%, #e5e7eb 30%, #3b82f6 30%, #3b82f6 100%);
      border: 2px solid #374151;
      border-radius: 4px;
    }

    .pump-preview {
      background-color: #10b981;
      border-radius: 50%;
      border: 2px solid #374151;
    }

    .valve-preview {
      background: linear-gradient(45deg, #ef4444 0%, #ef4444 50%, transparent 50%);
      border: 2px solid #374151;
    }

    .gauge-preview {
      border: 3px solid #3b82f6;
      border-radius: 50% 50% 0 0;
      border-bottom: none;
    }

    .pipe-preview {
      background-color: #9ca3af;
      height: 10px;
      border: 2px solid #374151;
    }

    .label-preview {
      font-size: 24px;
      font-weight: bold;
      color: #374151;
    }

    .button-preview {
      background-color: #3b82f6;
      color: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 12px;
      border: 2px solid #2563eb;
    }

    .component-item span {
      font-size: 0.75rem;
      color: #4b5563;
    }

    /* Canvas */
    .canvas-wrapper {
      flex: 1;
      padding: 1rem;
      overflow: auto;
      position: relative;
    }

    .canvas {
      width: 1200px;
      height: 800px;
      background-color: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .grid-background {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    .scada-element {
      position: absolute;
      cursor: move;
      user-select: none;
    }

    .scada-element.selected {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .tank-svg, .pump-svg, .valve-svg, .gauge-svg, .pipe-svg {
      width: 100%;
      height: 100%;
    }

    .pump-rotation {
      animation: rotate 2s linear infinite;
      transform-origin: 50px 40px;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .label-element {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #374151;
    }

    .button-element {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #3b82f6;
      color: white;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      user-select: none;
    }

    .button-element:hover {
      background-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    }

    .button-element.pressed {
      background-color: #1e40af;
      transform: translateY(1px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .button-text {
      pointer-events: none;
    }

    .resize-handles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .resize-handle {
      position: absolute;
      width: 8px;
      height: 8px;
      background-color: #3b82f6;
      border: 1px solid white;
      pointer-events: all;
      cursor: nwse-resize;
    }

    .resize-handle.nw { top: -4px; left: -4px; }
    .resize-handle.ne { top: -4px; right: -4px; cursor: nesw-resize; }
    .resize-handle.sw { bottom: -4px; left: -4px; cursor: nesw-resize; }
    .resize-handle.se { bottom: -4px; right: -4px; }

    /* Properties Panel */
    .properties-panel {
      width: 280px;
      background-color: white;
      border-left: 1px solid #e5e7eb;
      padding: 1rem;
      overflow-y: auto;
    }

    .properties-panel h3 {
      margin-top: 0;
      color: #1f2937;
      font-size: 1rem;
    }

    .property-group {
      margin-bottom: 1rem;
    }

    .property-group label {
      display: block;
      margin-bottom: 0.25rem;
      color: #4b5563;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .property-group input[type="text"],
    .property-group input[type="number"],
    .property-group input[type="color"] {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
    }

    .property-group input[type="checkbox"] {
      margin-right: 0.5rem;
    }

    .property-actions {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class ViewBuilderComponent implements OnInit {
  @ViewChild('canvas') canvasRef!: ElementRef;

  currentView: View = {
    id: '',
    name: 'Ny View',
    description: '',
    elements: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  selectedElement: ScadaElement | null = null;
  draggedType: string = '';
  isDragging = false;
  dragStartX = 0;
  dragStartY = 0;

  ngOnInit() {
    // Check if there's a view to edit
    const editingView = localStorage.getItem('current-editing-view');
    if (editingView) {
      this.currentView = JSON.parse(editingView);
      this.selectedElement = null;
      localStorage.removeItem('current-editing-view');
      console.log('Loaded view for editing:', this.currentView.name);
    }

    // Load saved views from localStorage
    const saved = localStorage.getItem('scada-views');
    if (saved) {
      console.log('Loaded saved views:', saved);
    }
  }

  onDragStart(event: DragEvent, type: string) {
    this.draggedType = type;
    event.dataTransfer!.effectAllowed = 'copy';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.addElement(this.draggedType, x, y);
  }

  addElement(type: string, x: number, y: number) {
    const defaultSizes: any = {
      tank: { width: 100, height: 150 },
      pump: { width: 100, height: 80 },
      valve: { width: 80, height: 80 },
      gauge: { width: 120, height: 100 },
      pipe: { width: 100, height: 20 },
      label: { width: 100, height: 40 },
      button: { width: 120, height: 50 }
    };

    const size = defaultSizes[type] || { width: 100, height: 100 };

    const element: ScadaElement = {
      id: `element-${Date.now()}`,
      type: type as any,
      x: x - size.width / 2,
      y: y - size.height / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
      config: {
        label: '',
        fillLevel: 50,
        isRunning: false,
        isOpen: false,
        color: '#e5e7eb',
        buttonAction: 'ON/OFF',
        isPressed: false
      }
    };

    this.currentView.elements.push(element);
    this.selectElement(null, element);
  }

  onButtonClick(event: MouseEvent, element: ScadaElement) {
    event.stopPropagation();
    
    // Visual feedback
    element.config.isPressed = true;
    setTimeout(() => {
      element.config.isPressed = false;
    }, 200);

    console.log(`🔘 Button clicked: ${element.config.buttonAction}`, {
      elementId: element.id,
      action: element.config.buttonAction,
      tagBinding: element.config.tagBinding
    });

    alert(`🔘 Button: ${element.config.buttonAction}\nTag: ${element.config.tagBinding || 'Not bound'}`);
  }

  selectElement(event: any, element: ScadaElement) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedElement = element;
  }

  deselectAll() {
    this.selectedElement = null;
  }

  startDrag(event: MouseEvent, element: ScadaElement) {
    event.preventDefault();
    this.isDragging = true;
    this.dragStartX = event.clientX - element.x;
    this.dragStartY = event.clientY - element.y;

    const onMouseMove = (e: MouseEvent) => {
      if (this.isDragging && this.selectedElement) {
        this.selectedElement.x = e.clientX - this.dragStartX;
        this.selectedElement.y = e.clientY - this.dragStartY;
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  deleteElement() {
    if (this.selectedElement) {
      this.currentView.elements = this.currentView.elements.filter(
        e => e.id !== this.selectedElement!.id
      );
      this.selectedElement = null;
    }
  }

  getGaugeArc(element: ScadaElement): string {
    const value = element.config.fillLevel || 0;
    const percentage = value / 100;
    const angle = -180 + (percentage * 180);
    const radians = (angle * Math.PI) / 180;
    
    const x = 60 + 40 * Math.cos(radians);
    const y = 80 + 40 * Math.sin(radians);
    
    const largeArc = percentage > 0.5 ? 1 : 0;
    
    return `M 20 80 A 40 40 0 ${largeArc} 1 ${x} ${y}`;
  }

  saveView() {
    this.currentView.updatedAt = new Date();
    
    const views = this.loadViewsFromStorage();
    const existingIndex = views.findIndex(v => v.id === this.currentView.id);
    
    if (existingIndex >= 0) {
      views[existingIndex] = this.currentView;
    } else {
      this.currentView.id = `view-${Date.now()}`;
      views.push(this.currentView);
    }

    localStorage.setItem('scada-views', JSON.stringify(views));
    alert(`✅ View "${this.currentView.name}" sparad!`);
  }

  loadViews() {
    const views = this.loadViewsFromStorage();
    
    if (views.length === 0) {
      alert('Inga sparade views funna.');
      return;
    }

    const viewNames = views.map((v, i) => `${i + 1}. ${v.name}`).join('\n');
    const choice = prompt(`Välj view att ladda:\n\n${viewNames}\n\nAnge nummer:`);
    
    if (choice) {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < views.length) {
        this.currentView = views[index];
        this.selectedElement = null;
        alert(`✅ View "${this.currentView.name}" laddad!`);
      }
    }
  }

  private loadViewsFromStorage(): View[] {
    const saved = localStorage.getItem('scada-views');
    return saved ? JSON.parse(saved) : [];
  }

  clearCanvas() {
    if (confirm('Är du säker på att du vill rensa canvas?')) {
      this.currentView.elements = [];
      this.selectedElement = null;
    }
  }
}
