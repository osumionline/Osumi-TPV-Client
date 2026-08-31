import type { Routes } from '@angular/router';
import applicationProblemGuard from '@guards/application-problem.guard';
import notInstalledGuard from '@guards/not-installed.guard';
import readyApplicationGuard from '@guards/ready-application.guard';
import startupGuard from '@guards/startup.guard';

const routes: Routes = [
  {
    path: 'instalacion',
    canActivate: [notInstalledGuard],
    loadComponent: () => import('@modules/configuracion/pages/installation/installation.component'),
  },
  {
    path: 'estado-aplicacion',
    canActivate: [applicationProblemGuard],
    loadComponent: () =>
      import('@modules/configuracion/pages/application-status/application-status.component'),
  },
  {
    path: 'startup',
    canActivate: [startupGuard],
    loadComponent: () => import('@modules/startup/pages/startup/startup.component'),
  },
  {
    path: 'ventas',
    canActivate: [readyApplicationGuard],
    loadComponent: () => import('@modules/ventas/pages/sales/sales.component'),
  },
  {
    path: 'articulos',
    canActivate: [readyApplicationGuard],
    loadComponent: () => import('@modules/articulos/pages/articles/articles.component'),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'startup',
  },
  {
    path: '**',
    redirectTo: 'startup',
  },
];

export default routes;
