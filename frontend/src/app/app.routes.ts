import { Routes } from '@angular/router';
import { Dashboard } from './components/dashboard/dashboard';
import { PlcList } from './components/plc-list/plc-list';
import { PlcDetail } from './components/plc-detail/plc-detail';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'plcs', component: PlcList },
  { path: 'plcs/:id', component: PlcDetail },
  { path: '**', redirectTo: '/dashboard' }
];
