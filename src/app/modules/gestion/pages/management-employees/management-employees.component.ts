import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { GESTION_PERMISSIONS } from '@constants/gestion-permissions.constants';
import createEmpleadoDataFormInitialValue from '@model/empleados/empleado-data-form.initial-value';
import type { EmpleadoDataFormModel } from '@model/empleados/empleado-data-form.model';
import empleadoDataFormSchema from '@model/empleados/empleado-data-form.schema';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';
import GestionSessionService from '@services/gestion/gestion-session.service';

/**
 * Muestra y permite seleccionar los empleados
 * disponibles en el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-employees',
  templateUrl: './management-employees.component.html',
  styleUrl: './management-employees.component.scss',
  imports: [RouterLink, FormField, MatButton, MatFormFieldModule, MatIcon, MatInput, MatTabsModule],
})
export default class ManagementEmployeesComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  private readonly gestionSessionService: GestionSessionService = inject(GestionSessionService);

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosService.empleados;

  readonly searchTerm: WritableSignal<string> = signal<string>('');

  readonly selectedEmpleado: WritableSignal<Empleado | null> = signal<Empleado | null>(null);

  readonly creatingEmpleado: WritableSignal<boolean> = signal<boolean>(false);

  readonly empleadoDataModel: WritableSignal<EmpleadoDataFormModel> = signal<EmpleadoDataFormModel>(
    createEmpleadoDataFormInitialValue(null),
  );

  readonly empleadoDataForm: FieldTree<EmpleadoDataFormModel> = form(
    this.empleadoDataModel,
    empleadoDataFormSchema,
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
  }

  private resetEmpleadoDataForm(empleado: Empleado | null): void {
    this.empleadoDataForm().reset(createEmpleadoDataFormInitialValue(empleado));
  }
}
