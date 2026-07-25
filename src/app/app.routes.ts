import { type Routes } from '@angular/router';
import { configuredGuard, notConfiguredGuard } from '@guards/configuration.guard';

const routes: Routes = [
  {
    path: 'installation',
    canActivate: [notConfiguredGuard],
    loadComponent: () => import('@pages/installation/installation'),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [configuredGuard],
    loadComponent: () => import('@pages/home/home'),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

export default routes;
