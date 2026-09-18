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
import { RouterLink } from '@angular/router';
import {
  EMPLEADO_PERMISSION_GROUPS,
  type EmpleadoPermissionGroup,
} from '@constants/empleado-permissions.constants';
import { GESTION_PERMISSIONS } from '@constants/gestion-permissions.constants';
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

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosService.empleados;

  readonly searchTerm: WritableSignal<string> = signal<string>('');
  readonly selectedEmpleado: WritableSignal<Empleado | null> = signal<Empleado | null>(null);
  readonly creatingEmpleado: WritableSignal<boolean> = signal<boolean>(false);
  readonly savingEmpleado: WritableSignal<boolean> = signal<boolean>(false);
  readonly selectedEmpleadoPermisos: WritableSignal<readonly number[]> = signal<readonly number[]>(
    [],
  );
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

  readonly canManageEmpleadoPermissions: Signal<boolean> = computed(
    (): boolean =>
      this.gestionEmpleado()?.hasPerm(GESTION_PERMISSIONS.EMPLOYEES_PERMISSIONS) ?? false,
  );

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

  readonly canSaveEmpleado: Signal<boolean> = computed(
    (): boolean =>
      this.canEditEmpleadoData() &&
      !this.savingEmpleado() &&
      this.empleadoDataForm().dirty() &&
      !this.empleadoDataForm().invalid(),
  );

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
   * Valida y persiste los datos del empleado
   * que se está creando o editando.
   */
  async saveEmpleado(): Promise<void> {
    if (this.savingEmpleado() || !this.canEditEmpleadoData()) {
      return;
    }

    this.empleadoDataForm().markAsTouched();

    if (this.empleadoDataForm().invalid()) {
      return;
    }

    const data: EmpleadoDataFormModel = this.empleadoDataModel();

    this.savingEmpleado.set(true);

    try {
      const empleado: Empleado = this.creatingEmpleado()
        ? await this.createEmpleado(data)
        : await this.updateEmpleado(data);

      this.creatingEmpleado.set(false);
      this.selectedEmpleado.set(empleado);

      this.resetEmpleadoDataForm(empleado);
      this.resetEmpleadoPermissions(empleado);
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

  private createEmpleado(data: EmpleadoDataFormModel): Promise<Empleado> {
    const command: CrearEmpleadoCommand = {
      nombre: data.nombre.trim(),
      password: data.password,
      color: data.color,

      /*
       * La edición de permisos se incorporará
       * en el bloque específico de Permisos.
       */
      permisos: [],
    };

    return this.empleadosService.create(command);
  }

  private updateEmpleado(data: EmpleadoDataFormModel): Promise<Empleado> {
    const empleado: Empleado | null = this.selectedEmpleado();

    if (empleado === null || empleado.id === null) {
      throw new Error('No hay ningún empleado seleccionado para modificar.');
    }

    const command: ActualizarEmpleadoCommand = {
      nombre: data.nombre.trim(),

      password: data.password === '' ? null : data.password,

      color: data.color,

      /*
       * Datos no modifica los permisos.
       */
      permisos: [...empleado.permisos],
    };

    return this.empleadosService.update(empleado.id, command);
  }

  private resetEmpleadoPermissions(empleado: Empleado | null): void {
    if (empleado === null) {
      this.selectedEmpleadoPermisos.set([]);

      return;
    }

    if (empleado.admin) {
      this.selectedEmpleadoPermisos.set(
        EMPLEADO_PERMISSION_GROUPS.flatMap((group: EmpleadoPermissionGroup): readonly number[] =>
          group.permissions.map((permission): number => permission.id),
        ),
      );

      return;
    }

    this.selectedEmpleadoPermisos.set([...empleado.permisos]);
  }

  private resetEmpleadoDataForm(empleado: Empleado | null): void {
    this.empleadoDataForm().reset(createEmpleadoDataFormInitialValue(empleado));
  }
}
