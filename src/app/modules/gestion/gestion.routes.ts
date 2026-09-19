import type { Routes } from '@angular/router';
import {
  GESTION_EMPLOYEES_PERMISSIONS,
  GESTION_PERMISSIONS,
} from '@constants/gestion-permissions.constants';
import gestionPermissionGuard from '@guards/gestion-permission.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@modules/gestion/pages/management-shell/management-shell.component'),
    children: [
      {
        path: 'ajustes',
        canActivate: [gestionPermissionGuard],
        loadComponent: () =>
          import('@modules/gestion/pages/management-settings/management-settings.component'),
        data: {
          requiredPermissions: [GESTION_PERMISSIONS.SETTINGS],
          title: 'Ajustes iniciales',
          icon: 'settings',
          description: 'Aquí podrás modificar la configuración general de Osumi TPV.',
        },
      },
      {
        path: 'empleados',
        canActivate: [gestionPermissionGuard],
        loadComponent: () =>
          import('@modules/gestion/pages/management-employees/management-employees.component'),
        data: {
          requiredPermissions: GESTION_EMPLOYEES_PERMISSIONS,
          title: 'Empleados',
          icon: 'badge',
          description: 'Aquí podrás gestionar los empleados de la tienda.',
        },
      },
      {
        path: 'tipos-pago',
        canActivate: [gestionPermissionGuard],
        loadComponent: () =>
          import('@modules/gestion/pages/management-payment-types/management-payment-types.component'),
        data: {
          requiredPermissions: [GESTION_PERMISSIONS.PAYMENT_TYPES],
          title: 'Tipos de pago',
          icon: 'credit_card',
          description: 'Aquí podrás gestionar los tipos de pago utilizados por la aplicación.',
        },
      },
      {
        path: 'copias-seguridad',
        canActivate: [gestionPermissionGuard],
        loadComponent: () =>
          import('@modules/gestion/pages/management-placeholder/management-placeholder.component'),
        data: {
          requiredPermissions: [GESTION_PERMISSIONS.BACKUPS],
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
