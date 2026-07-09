import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AppShellComponent } from './layout/app-shell/app-shell';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';

import { Orders } from './pages/orders/orders';
import { Stock } from './pages/stock/stock';
import { Items } from './pages/items/items';
import { Companies } from './pages/companies/companies';
import { WarehouseLocations } from './pages/warehouse-locations/warehouse-locations';
import { UsersComponent } from './pages/users/users';
import { ReferenceData } from './pages/reference-data/reference-data';
import { Documents } from './pages/documents/documents';
import { Billing } from './pages/billing/billing';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login | Warehouse PWA',
  },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard | Warehouse PWA',
      },
      {
        path: 'orders',
        component: Orders,
        title: 'Orders | Warehouse PWA',
      },
      {
        path: 'stock',
        component: Stock,
        title: 'Stock | Warehouse PWA',
      },
      {
        path: 'items',
        component: Items,
        title: 'Items | Warehouse PWA',
      },
      {
        path: 'companies',
        component: Companies,
        title: 'Companies | Warehouse PWA',
      },
      {
        path: 'warehouse-locations',
        component: WarehouseLocations,
        title: 'Warehouse locations | Warehouse PWA',
      },
      {
        path: 'users',
        component: UsersComponent,
        title: 'Users | Warehouse PWA',
      },
      {
        path: 'reference-data',
        component: ReferenceData,
        title: 'Reference data | Warehouse PWA',
      },
      {
        path: 'documents',
        component: Documents,
        title: 'Documents | Warehouse PWA',
      },
      {
        path: 'billing',
        component: Billing,
        title: 'Billing | Warehouse PWA',
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];