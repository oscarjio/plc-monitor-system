import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface View {
  id: string;
  name: string;
  description: string;
  elements: any[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-view-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="view-manager">
      <!-- Header -->
      <div class="manager-header">
        <h2>📋 Mina Vyer</h2>
        <button class="btn-primary" (click)="createNewView()">
          ➕ Skapa Ny View
        </button>
      </div>

      <!-- Views Grid -->
      <div class="views-grid" *ngIf="views.length > 0">
        <div 
          *ngFor="let view of views" 
          class="view-card">
          
          <!-- Thumbnail -->
          <div class="view-thumbnail">
            <div class="thumbnail-content">
              <span class="element-count">{{ view.elements.length }} element</span>
            </div>
          </div>

          <!-- View Info -->
          <div class="view-info">
            <h3>{{ view.name }}</h3>
            <p class="view-description">
              {{ view.description || 'Ingen beskrivning' }}
            </p>

            <div class="view-meta">
              <div class="meta-item">
                <span class="meta-label">Skapad:</span>
                <span class="meta-value">{{ formatDate(view.createdAt) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Senast ändrad:</span>
                <span class="meta-value">{{ formatDate(view.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="view-actions">
            <button (click)="editView(view)" class="btn-action btn-edit">
              ✏️ Redigera
            </button>
            <button (click)="duplicateView(view)" class="btn-action btn-duplicate">
              📋 Duplicera
            </button>
            <button (click)="deleteView(view)" class="btn-action btn-delete">
              🗑️ Ta bort
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="views.length === 0">
        <div class="empty-icon">📋</div>
        <h3>Inga vyer ännu</h3>
        <p>Skapa din första SCADA-view för att komma igång!</p>
        <button class="btn-primary btn-large" (click)="createNewView()">
          ✨ Skapa Din Första View
        </button>
      </div>
    </div>
  `,
  styles: [`
    .view-manager {
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
      font-size: 2rem;
    }

    .btn-primary {
      padding: 0.75rem 1.5rem;
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .btn-primary:hover {
      background-color: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .btn-large {
      padding: 1rem 2rem;
      font-size: 1.1rem;
    }

    /* Views Grid */
    .views-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .view-card {
      background-color: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s;
    }

    .view-card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    /* Thumbnail */
    .view-thumbnail {
      height: 180px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .thumbnail-content {
      text-align: center;
      color: white;
    }

    .element-count {
      font-size: 1.5rem;
      font-weight: bold;
      opacity: 0.9;
    }

    /* View Info */
    .view-info {
      padding: 1.5rem;
    }

    .view-info h3 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .view-description {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
      min-height: 40px;
    }

    .view-meta {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
      display: grid;
      gap: 0.5rem;
    }

    .meta-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .meta-label {
      color: #6b7280;
      font-weight: 500;
    }

    .meta-value {
      color: #1f2937;
    }

    /* Actions */
    .view-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .btn-action {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      background-color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-edit {
      color: #3b82f6;
      border-color: #3b82f6;
    }

    .btn-edit:hover {
      background-color: #eff6ff;
    }

    .btn-duplicate {
      color: #8b5cf6;
      border-color: #8b5cf6;
    }

    .btn-duplicate:hover {
      background-color: #f5f3ff;
    }

    .btn-delete {
      color: #ef4444;
      border-color: #ef4444;
    }

    .btn-delete:hover {
      background-color: #fee2e2;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin: 0 0 2rem 0;
      font-size: 1.1rem;
    }

    @media (max-width: 768px) {
      .views-grid {
        grid-template-columns: 1fr;
      }

      .manager-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
      }

      .view-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ViewManagerComponent implements OnInit {
  views: View[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadViews();
  }

  loadViews() {
    const saved = localStorage.getItem('scada-views');
    if (saved) {
      this.views = JSON.parse(saved);
      // Convert string dates to Date objects
      this.views.forEach(view => {
        view.createdAt = new Date(view.createdAt);
        view.updatedAt = new Date(view.updatedAt);
      });
    }
  }

  createNewView() {
    this.router.navigate(['/view-builder']);
  }

  editView(view: View) {
    // Store the view to edit
    localStorage.setItem('current-editing-view', JSON.stringify(view));
    this.router.navigate(['/view-builder']);
  }

  duplicateView(view: View) {
    const duplicate: View = {
      ...view,
      id: `view-${Date.now()}`,
      name: `${view.name} (kopia)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.views.push(duplicate);
    this.saveViews();
    alert(`✅ View duplicerad: ${duplicate.name}`);
  }

  deleteView(view: View) {
    if (!confirm(`Är du säker på att du vill ta bort "${view.name}"?`)) {
      return;
    }

    this.views = this.views.filter(v => v.id !== view.id);
    this.saveViews();
    alert(`✅ View borttagen: ${view.name}`);
  }

  private saveViews() {
    localStorage.setItem('scada-views', JSON.stringify(this.views));
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Idag';
    } else if (days === 1) {
      return 'Igår';
    } else if (days < 7) {
      return `${days} dagar sedan`;
    } else {
      return date.toLocaleDateString('sv-SE');
    }
  }
}
