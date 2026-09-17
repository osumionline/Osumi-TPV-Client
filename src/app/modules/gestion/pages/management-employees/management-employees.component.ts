import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';

/**
 * Muestra y permite seleccionar los empleados
 * disponibles en el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-employees',
  templateUrl: './management-employees.component.html',
  styleUrl: './management-employees.component.scss',
  imports: [RouterLink, MatButton, MatFormFieldModule, MatIcon, MatInput],
})
export default class ManagementEmployeesComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosService.empleados;

  readonly searchTerm: WritableSignal<string> = signal<string>('');

  readonly selectedEmpleado: WritableSignal<Empleado | null> = signal<Empleado | null>(null);

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
    this.selectedEmpleado.set(empleado);
  }
}
