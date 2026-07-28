import { type Routes } from '@angular/router';
import configuredGuard from '@guards/configured.guard.fn';
import notConfiguredGuard from '@guards/not-configured.guard.fn';

const routes: Routes = [
  {
    path: 'installation',
    canActivate: [notConfiguredGuard],
    loadComponent: () => import('@modules/configuracion/installation/installation.component'),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [configuredGuard],
    loadComponent: () => import('@modules/pages/home/home'),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

export default routes;
