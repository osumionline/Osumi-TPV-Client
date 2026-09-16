import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

interface ManagementModuleItem {
  readonly id: 'settings' | 'employees' | 'payment-types' | 'backups';
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
}

/**
 * Muestra el acceso principal a los módulos de Gestión.
 */
@Component({
  selector: 'otpv-management-home',
  templateUrl: './management-home.component.html',
  styleUrl: './management-home.component.scss',
  imports: [MatIcon, RouterLink],
})
export default class ManagementHomeComponent {
  readonly modules: readonly ManagementModuleItem[] = [
    {
      id: 'settings',
      title: 'Ajustes iniciales',
      description: 'Configuración general de Osumi TPV.',
      icon: 'settings',
      route: '/gestion/ajustes',
    },
    {
      id: 'employees',
      title: 'Empleados',
      description: 'Empleados, contraseñas y permisos.',
      icon: 'badge',
      route: '/gestion/empleados',
    },
    {
      id: 'payment-types',
      title: 'Tipos de pago',
      description: 'Formas de pago disponibles en la aplicación.',
      icon: 'credit_card',
      route: '/gestion/tipos-pago',
    },
    {
      id: 'backups',
      title: 'Copias de seguridad',
      description: 'Gestión de las copias de seguridad.',
      icon: 'cloud_upload',
      route: '/gestion/copias-seguridad',
    },
  ];
}
