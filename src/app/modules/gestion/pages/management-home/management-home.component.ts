import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
  GESTION_EMPLOYEES_PERMISSIONS,
  GESTION_PERMISSIONS,
} from '@constants/gestion-permissions.constants';
import type PermissionId from '@desktop-contracts/configuration/permissions/permission-id.type';
import type Empleado from '@model/empleados/empleado.model';
import ManagementPasswordDialogComponent from '@modules/gestion/components/management-password-dialog/management-password-dialog.component';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

interface ManagementModuleItem {
  readonly id: 'settings' | 'employees' | 'payment-types' | 'backups';
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly route: string;
  readonly requiredPermissions: readonly PermissionId[];
}

/**
 * Muestra el acceso principal a los módulos de Gestión.
 */
@Component({
  selector: 'otpv-management-home',
  templateUrl: './management-home.component.html',
  styleUrl: './management-home.component.scss',
  imports: [ManagementPasswordDialogComponent, MatButton, MatIcon, MatTooltip, RouterLink],
})
export default class ManagementHomeComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  private readonly gestionSessionService: GestionSessionService = inject(GestionSessionService);

  private readonly activeEmpleadoIdSignal: WritableSignal<number | null> = signal<number | null>(
    this.resolveInitialEmpleadoId(),
  );

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosService.empleados;

  readonly passwordModalOpen: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectedEmpleado: WritableSignal<Empleado | null> = signal<Empleado | null>(null);

  readonly empleadoGestion: Signal<Empleado | null> = computed((): Empleado | null => {
    const empleadoId: number | null = this.activeEmpleadoIdSignal();

    return empleadoId === null ? null : this.empleadosService.findById(empleadoId);
  });

  readonly modules: readonly ManagementModuleItem[] = [
    {
      id: 'settings',
      title: 'Ajustes iniciales',
      description: 'Configuración general de Osumi TPV.',
      icon: 'settings',
      route: '/gestion/ajustes',
      requiredPermissions: [GESTION_PERMISSIONS.SETTINGS],
    },
    {
      id: 'employees',
      title: 'Empleados',
      description: 'Empleados, contraseñas y permisos.',
      icon: 'badge',
      route: '/gestion/empleados',
      requiredPermissions: GESTION_EMPLOYEES_PERMISSIONS,
    },
    {
      id: 'payment-types',
      title: 'Tipos de pago',
      description: 'Formas de pago disponibles en la aplicación.',
      icon: 'credit_card',
      route: '/gestion/tipos-pago',
      requiredPermissions: [GESTION_PERMISSIONS.PAYMENT_TYPES],
    },
    {
      id: 'backups',
      title: 'Copias de seguridad',
      description: 'Gestión de las copias de seguridad.',
      icon: 'cloud_upload',
      route: '/gestion/copias-seguridad',
      requiredPermissions: [GESTION_PERMISSIONS.BACKUPS],
    },
  ];

  /**
   * Solicita las credenciales del empleado seleccionado.
   */
  selectEmpleado(empleado: Empleado): void {
    if (empleado.id === null) {
      return;
    }

    this.selectedEmpleado.set(empleado);
    this.passwordModalOpen.set(true);
  }

  /**
   * Cierra el modal de autenticación.
   */
  closePasswordModal(): void {
    this.passwordModalOpen.set(false);
    this.selectedEmpleado.set(null);
  }

  /**
   * Inicia la sesión de Gestión tras autenticar al empleado.
   */
  onEmpleadoAuthenticated(): void {
    const empleado: Empleado | null = this.selectedEmpleado();

    if (empleado?.id === null || empleado === null) {
      this.closePasswordModal();

      return;
    }

    this.gestionSessionService.login(empleado.id);
    this.activeEmpleadoIdSignal.set(empleado.id);

    this.closePasswordModal();
  }

  /**
   * Finaliza la sesión de Gestión y vuelve al selector de empleados.
   */
  changeEmpleado(): void {
    this.gestionSessionService.logout();
    this.activeEmpleadoIdSignal.set(null);
  }

  private resolveInitialEmpleadoId(): number | null {
    if (!this.gestionSessionService.isActive()) {
      return null;
    }

    const empleadoId: number | null = this.gestionSessionService.empleadoId();

    if (empleadoId === null) {
      return null;
    }

    if (this.empleadosService.findById(empleadoId) === null) {
      this.gestionSessionService.logout();

      return null;
    }

    return empleadoId;
  }

  /**
   * Indica si el empleado autenticado puede acceder a un módulo de Gestión.
   */
  canAccessModule(module: ManagementModuleItem): boolean {
    const empleado: Empleado | null = this.empleadoGestion();

    return empleado?.hasAnyPerm(module.requiredPermissions) ?? false;
  }
}
