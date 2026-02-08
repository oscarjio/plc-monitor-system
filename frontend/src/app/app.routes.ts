import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { PlcList } from './components/plc-list/plc-list';
import { PlcDetail } from './components/plc-detail/plc-detail';
import { ViewBuilderComponent } from './components/view-builder/view-builder.component';
import { ViewManagerComponent } from './components/view-manager/view-manager.component';
import { PlcHistoryComponent } from './components/plc-history/plc-history.component';
import { PlcManagerComponent } from './components/plc-manager/plc-manager.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'plcs', component: PlcList },
  { path: 'plcs/:id', component: PlcDetail },
  { path: 'plc-manager', component: PlcManagerComponent },
  { path: 'views', component: ViewManagerComponent },
  { path: 'view-builder', component: ViewBuilderComponent },
  { path: 'history', component: PlcHistoryComponent },
  { path: 'history/:id', component: PlcHistoryComponent },
  { path: '**', redirectTo: '/dashboard' }
];
