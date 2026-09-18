import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import {
  disabled,
  FieldTree,
  form,
  FormField,
  readonly as readonlyField,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import {
  EMPLEADO_PERMISSION_GROUPS,
  type EmpleadoPermissionGroup,
} from '@constants/empleado-permissions.constants';
import {
  GESTION_EMPLOYEES_PERMISSIONS,
  GESTION_PERMISSIONS,
} from '@constants/gestion-permissions.constants';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import createEmpleadoDataFormInitialValue from '@model/empleados/empleado-data-form.initial-value';
import type { EmpleadoDataFormModel } from '@model/empleados/empleado-data-form.model';
import empleadoDataFormSchema from '@model/empleados/empleado-data-form.schema';
import type Empleado from '@model/empleados/empleado.model';
import { DialogService } from '@osumi/angular-tools';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';
import { getErrorMessage } from '@utils/error.utils';
import { firstValueFrom } from 'rxjs';

/**
 * Muestra y permite seleccionar los empleados
 * disponibles en el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-employees',
  templateUrl: './management-employees.component.html',
  styleUrl: './management-employees.component.scss',
  imports: [
    RouterLink,
    FormField,
    MatButton,
    MatCheckbox,
    MatFormFieldModule,
    MatIcon,
    MatInput,
    MatTabsModule,
    MatTooltip,
  ],
})
export default class ManagementEmployeesComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);
  private readonly gestionSessionService: GestionSessionService = inject(GestionSessionService);
  private readonly dialog: DialogService = inject(DialogService);
  private readonly router: Router = inject(Router);

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosService.empleados;

  readonly searchTerm: WritableSignal<string> = signal<string>('');
  readonly selectedEmpleado: WritableSignal<Empleado | null> = signal<Empleado | null>(null);
  readonly creatingEmpleado: WritableSignal<boolean> = signal<boolean>(false);
  readonly savingEmpleado: WritableSignal<boolean> = signal<boolean>(false);
  readonly deletingEmpleado: WritableSignal<boolean> = signal<boolean>(false);
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  private saveFeedbackTimeoutId: number | null = null;

  readonly selectedEmpleadoPermisos: WritableSignal<readonly number[]> = signal<readonly number[]>(
    [],
  );
  private readonly initialEmpleadoPermisos: WritableSignal<readonly number[]> = signal<
    readonly number[]
  >([]);
  readonly empleadoPermissionGroups: readonly EmpleadoPermissionGroup[] =
    EMPLEADO_PERMISSION_GROUPS;
  readonly empleadoDataModel: WritableSignal<EmpleadoDataFormModel> = signal<EmpleadoDataFormModel>(
    createEmpleadoDataFormInitialValue(null),
  );

  readonly gestionEmpleado: Signal<Empleado | null> = computed((): Empleado | null => {
    const empleadoId: number | null = this.gestionSessionService.empleadoId();

    if (empleadoId === null) {
      return null;
    }

    return this.empleadosService.findById(empleadoId);
  });

  readonly canCreateEmpleado: Signal<boolean> = computed(
    (): boolean => this.gestionEmpleado()?.hasPerm(GESTION_PERMISSIONS.EMPLOYEES_CREATE) ?? false,
  );

  readonly canUpdateEmpleado: Signal<boolean> = computed(
    (): boolean => this.gestionEmpleado()?.hasPerm(GESTION_PERMISSIONS.EMPLOYEES_UPDATE) ?? false,
  );

  readonly canDeleteEmpleado: Signal<boolean> = computed(
    (): boolean => this.gestionEmpleado()?.hasPerm(GESTION_PERMISSIONS.EMPLOYEES_DELETE) ?? false,
  );

  readonly canDeleteSelectedEmpleado: Signal<boolean> = computed((): boolean => {
    const gestionEmpleado: Empleado | null = this.gestionEmpleado();
    const selectedEmpleado: Empleado | null = this.selectedEmpleado();
    if (gestionEmpleado === null || selectedEmpleado === null || selectedEmpleado.id === null) {
      return false;
    }
    return (
      this.canDeleteEmpleado() &&
      !this.creatingEmpleado() &&
      !this.savingEmpleado() &&
      !this.deletingEmpleado() &&
      selectedEmpleado.id !== gestionEmpleado.id
    );
  });

  readonly canManageEmpleadoPermissions: Signal<boolean> = computed(
    (): boolean =>
      this.gestionEmpleado()?.hasPerm(GESTION_PERMISSIONS.EMPLOYEES_PERMISSIONS) ?? false,
  );

  readonly canEditEmpleadoPermissions: Signal<boolean> = computed((): boolean => {
    if (!this.canManageEmpleadoPermissions()) {
      return false;
    }

    if (this.creatingEmpleado()) {
      return this.canCreateEmpleado();
    }

    const empleado: Empleado | null = this.selectedEmpleado();

    return empleado !== null && !empleado.admin;
  });

  readonly empleadoPermissionsDirty: Signal<boolean> = computed((): boolean => {
    const current: readonly number[] = this.selectedEmpleadoPermisos();

    const initial: readonly number[] = this.initialEmpleadoPermisos();

    if (current.length !== initial.length) {
      return true;
    }

    return current.some(
      (permissionId: number, index: number): boolean => permissionId !== initial[index],
    );
  });

  readonly canEditEmpleadoData: Signal<boolean> = computed((): boolean => {
    if (this.creatingEmpleado()) {
      return this.canCreateEmpleado();
    }

    return this.selectedEmpleado() !== null && this.canUpdateEmpleado();
  });

  readonly empleadoDataForm: FieldTree<EmpleadoDataFormModel> = form(
    this.empleadoDataModel,
    (path): void => {
      empleadoDataFormSchema(path);

      readonlyField(path.nombre, {
        when: (): boolean => !this.canEditEmpleadoData(),
      });

      readonlyField(path.password, {
        when: (): boolean => !this.canEditEmpleadoData(),
      });

      readonlyField(path.confirmPassword, {
        when: (): boolean => !this.canEditEmpleadoData(),
      });

      disabled(path.color, {
        when: (): boolean => !this.canEditEmpleadoData(),
      });
    },
  );

  readonly canSaveEmpleado: Signal<boolean> = computed((): boolean => {
    if (this.savingEmpleado() || this.empleadoDataForm().invalid()) {
      return false;
    }

    const dataChanged: boolean = this.canEditEmpleadoData() && this.empleadoDataForm().dirty();

    const permissionsChanged: boolean =
      this.canEditEmpleadoPermissions() && this.empleadoPermissionsDirty();

    return dataChanged || permissionsChanged;
  });

  readonly filteredEmpleados: Signal<readonly Empleado[]> = computed((): readonly Empleado[] => {
    const searchTerm: string = this.searchTerm().trim().toLocaleLowerCase('es-ES');

    if (searchTerm === '') {
      return this.empleados();
    }

    return this.empleados().filter((empleado: Empleado): boolean =>
      empleado.nombre.toLocaleLowerCase('es-ES').includes(searchTerm),
    );
  });

  /**
   * Actualiza el texto utilizado para
   * filtrar el listado de empleados.
   */
  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  /**
   * Selecciona el empleado que se mostrará
   * en el área principal.
   */
  selectEmpleado(empleado: Empleado): void {
    this.clearSaveFeedback();
    this.creatingEmpleado.set(false);
    this.selectedEmpleado.set(empleado);
    this.resetEmpleadoDataForm(empleado);
    this.resetEmpleadoPermissions(empleado);
  }

  /**
   * Abre el área de creación de un empleado
   * cuando el usuario dispone del permiso necesario.
   */
  startCreatingEmpleado(): void {
    if (!this.canCreateEmpleado()) {
      return;
    }
    this.clearSaveFeedback();

    this.selectedEmpleado.set(null);
    this.creatingEmpleado.set(true);
    this.resetEmpleadoDataForm(null);
    this.resetEmpleadoPermissions(null);
  }

  /**
   * Descarta los cambios realizados en Datos.
   *
   * En un alta vuelve al estado inicial de la pantalla.
   * En edición restaura los datos persistidos del empleado.
   */
  cancelEmpleadoChanges(): void {
    if (this.savingEmpleado()) {
      return;
    }
    this.clearSaveFeedback();

    if (this.creatingEmpleado()) {
      this.creatingEmpleado.set(false);
      this.selectedEmpleado.set(null);

      this.resetEmpleadoDataForm(null);
      this.resetEmpleadoPermissions(null);

      return;
    }

    const empleado: Empleado | null = this.selectedEmpleado();

    if (empleado !== null) {
      this.resetEmpleadoDataForm(empleado);
      this.resetEmpleadoPermissions(empleado);
    }
  }

  /**
   * Solicita confirmación y da de baja
   * al empleado seleccionado.
   *
   * El empleado autenticado nunca puede
   * eliminarse a sí mismo.
   */
  async deleteEmpleado(): Promise<void> {
    if (!this.canDeleteSelectedEmpleado()) {
      return;
    }
    const empleado: Empleado | null = this.selectedEmpleado();
    if (empleado === null || empleado.id === null) {
      return;
    }
    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: 'Eliminar empleado',
        content:
          `¿Estás seguro de querer eliminar al empleado "${empleado.nombre}"? ` +
          'El empleado dejará de estar disponible en la aplicación.',
        warn: true,
        ok: 'Eliminar',
        cancel: 'Cancelar',
      }),
    );
    if (!confirmed) {
      return;
    }
    this.clearSaveFeedback();
    this.deletingEmpleado.set(true);
    try {
      await this.empleadosService.deactivate(empleado.id);
      this.selectedEmpleado.set(null);
      this.creatingEmpleado.set(false);
      this.resetEmpleadoDataForm(null);
      this.resetEmpleadoPermissions(null);
    } catch (error: unknown) {
      console.error('Error eliminando el empleado:', error);
      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido eliminar el empleado.'),
      });
    } finally {
      this.deletingEmpleado.set(false);
    }
  }

  /**
   * Valida y persiste los datos del empleado
   * que se está creando o editando.
   */
  async saveEmpleado(): Promise<void> {
    if (this.savingEmpleado()) {
      return;
    }

    if (this.creatingEmpleado()) {
      if (!this.canCreateEmpleado()) {
        return;
      }
    } else {
      const empleado: Empleado | null = this.selectedEmpleado();

      if (empleado === null) {
        return;
      }

      const dataChanged: boolean = this.canUpdateEmpleado() && this.hasEmpleadoDataChanges();

      const permissionsChanged: boolean =
        this.canEditEmpleadoPermissions() && this.empleadoPermissionsDirty();

      if (!dataChanged && !permissionsChanged) {
        return;
      }
    }

    this.empleadoDataForm().markAsTouched();

    if (this.empleadoDataForm().invalid()) {
      return;
    }

    const data: EmpleadoDataFormModel = this.empleadoDataModel();
    const wasCreatingEmpleado: boolean = this.creatingEmpleado();
    this.clearSaveFeedback();
    this.savingEmpleado.set(true);
    try {
      const empleado: Empleado = wasCreatingEmpleado
        ? await this.createEmpleado(data)
        : await this.updateEmpleado(data);
      this.creatingEmpleado.set(false);
      this.selectedEmpleado.set(empleado);
      this.resetEmpleadoDataForm(empleado);
      this.resetEmpleadoPermissions(empleado);
      const gestionEmpleadoId: number | null = this.gestionSessionService.empleadoId();
      if (
        !wasCreatingEmpleado &&
        empleado.id !== null &&
        empleado.id === gestionEmpleadoId &&
        !empleado.hasAnyPerm(GESTION_EMPLOYEES_PERMISSIONS)
      ) {
        await this.router.navigate(['/gestion']);
        return;
      }
      this.showSaveFeedback();
    } catch (error: unknown) {
      console.error('Error guardando el empleado:', error);

      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido guardar el empleado.'),
      });
    } finally {
      this.savingEmpleado.set(false);
    }
  }

  /**
   * Indica si el permiso está seleccionado
   * para el empleado mostrado actualmente.
   */
  hasEmpleadoPermission(permissionId: number): boolean {
    return this.selectedEmpleadoPermisos().includes(permissionId);
  }

  /**
   * Marca o desmarca un permiso del empleado
   * cuando el usuario puede modificar permisos.
   */
  setEmpleadoPermission(permissionId: number, checked: boolean): void {
    if (!this.canEditEmpleadoPermissions()) {
      return;
    }

    const current: readonly number[] = this.selectedEmpleadoPermisos();

    const next: readonly number[] = checked
      ? [...current, permissionId]
      : current.filter(
          (currentPermissionId: number): boolean => currentPermissionId !== permissionId,
        );

    this.selectedEmpleadoPermisos.set(this.normalizeEmpleadoPermissions(next));
  }

  private hasEmpleadoDataChanges(): boolean {
    const empleado: Empleado | null = this.selectedEmpleado();

    if (empleado === null) {
      return false;
    }

    const data: EmpleadoDataFormModel = this.empleadoDataModel();

    return (
      data.nombre.trim() !== empleado.nombre ||
      data.password !== '' ||
      data.color.toLowerCase() !== empleado.color.toLowerCase()
    );
  }

  private createEmpleado(data: EmpleadoDataFormModel): Promise<Empleado> {
    const command: CrearEmpleadoCommand = {
      nombre: data.nombre.trim(),
      password: data.password,
      color: data.color,
      permisos: this.canEditEmpleadoPermissions() ? [...this.selectedEmpleadoPermisos()] : [],
    };

    return this.empleadosService.create(command);
  }

  private updateEmpleado(data: EmpleadoDataFormModel): Promise<Empleado> {
    const empleado: Empleado | null = this.selectedEmpleado();

    if (empleado === null || empleado.id === null) {
      throw new Error('No hay ningún empleado seleccionado para modificar.');
    }

    const canUpdateData: boolean = this.canUpdateEmpleado();
    const canUpdatePermissions: boolean = this.canEditEmpleadoPermissions();
    const command: ActualizarEmpleadoCommand = {
      /*
       * Sin permiso 21 conservamos
       * exactamente los datos actuales.
       */
      nombre: canUpdateData ? data.nombre.trim() : empleado.nombre,
      password: canUpdateData && data.password !== '' ? data.password : null,
      color: canUpdateData ? data.color : empleado.color,

      /*
       * Sin permiso 23 conservamos
       * exactamente los permisos actuales.
       */
      permisos: canUpdatePermissions
        ? [...this.selectedEmpleadoPermisos()]
        : [...empleado.permisos],
    };

    return this.empleadosService.update(empleado.id, command);
  }

  private resetEmpleadoPermissions(empleado: Empleado | null): void {
    let permisos: readonly number[] = [];

    if (empleado?.admin) {
      permisos = EMPLEADO_PERMISSION_GROUPS.flatMap(
        (group: EmpleadoPermissionGroup): readonly number[] =>
          group.permissions.map((permission): number => permission.id),
      );
    } else if (empleado !== null) {
      permisos = empleado.permisos;
    }

    const normalized: readonly number[] = this.normalizeEmpleadoPermissions(permisos);

    this.selectedEmpleadoPermisos.set(normalized);

    this.initialEmpleadoPermisos.set([...normalized]);
  }

  private normalizeEmpleadoPermissions(permisos: readonly number[]): readonly number[] {
    return [...new Set<number>(permisos)].sort(
      (first: number, second: number): number => first - second,
    );
  }

  /**
   * Muestra temporalmente la confirmación
   * de que el empleado se ha guardado.
   */
  private showSaveFeedback(): void {
    this.clearSaveFeedback();

    this.saveSuccessful.set(true);

    this.saveFeedbackTimeoutId = window.setTimeout((): void => {
      this.saveSuccessful.set(false);

      this.saveFeedbackTimeoutId = null;
    }, 4_000);
  }

  /**
   * Oculta la confirmación de guardado activa.
   */
  private clearSaveFeedback(): void {
    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);

      this.saveFeedbackTimeoutId = null;
    }

    this.saveSuccessful.set(false);
  }

  private resetEmpleadoDataForm(empleado: Empleado | null): void {
    this.empleadoDataForm().reset(createEmpleadoDataFormInitialValue(empleado));
  }
}
