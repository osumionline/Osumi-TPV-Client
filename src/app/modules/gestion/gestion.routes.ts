import type { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@modules/gestion/pages/management-shell/management-shell.component'),
    children: [
      {
        path: 'ajustes',
        loadComponent: () =>
          import('@modules/gestion/pages/management-placeholder/management-placeholder.component'),
        data: {
          title: 'Ajustes iniciales',
          icon: 'settings',
          description: 'Aquí podrás modificar la configuración general de Osumi TPV.',
        },
      },
      {
        path: 'empleados',
        loadComponent: () =>
          import('@modules/gestion/pages/management-placeholder/management-placeholder.component'),
        data: {
          title: 'Empleados',
          icon: 'badge',
          description: 'Aquí podrás gestionar los empleados de la tienda.',
        },
      },
      {
        path: 'tipos-pago',
        loadComponent: () =>
          import('@modules/gestion/pages/management-placeholder/management-placeholder.component'),
        data: {
          title: 'Tipos de pago',
          icon: 'credit_card',
          description: 'Aquí podrás gestionar los tipos de pago utilizados por la aplicación.',
        },
      },
      {
        path: 'copias-seguridad',
        loadComponent: () =>
          import('@modules/gestion/pages/management-placeholder/management-placeholder.component'),
        data: {
          title: 'Copias de seguridad',
          icon: 'cloud_upload',
          description: 'Aquí podrás gestionar las copias de seguridad de Osumi TPV.',
        },
      },
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('@modules/gestion/pages/management-home/management-home.component'),
      },
      {
        path: '**',
        redirectTo: '',
      },
    ],
  },
];

export default routes;
