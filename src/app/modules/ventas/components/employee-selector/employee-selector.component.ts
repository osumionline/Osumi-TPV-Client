import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type Empleado from '@model/empleados/empleado.model';

/**
 * Permite elegir qué empleado atenderá una nueva venta.
 */
@Component({
  selector: 'otpv-employee-selector',
  templateUrl: './employee-selector.component.html',
  styleUrl: './employee-selector.component.scss',
  imports: [MatButton],
})
export default class EmployeeSelectorComponent {
  readonly empleados: InputSignal<readonly Empleado[]> = input.required<readonly Empleado[]>();

  readonly selectEvent: OutputEmitterRef<Empleado> = output<Empleado>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  /**
   * Selecciona el empleado indicado.
   */
  select(empleado: Empleado): void {
    this.selectEvent.emit(empleado);
  }

  /**
   * Cancela la creación de la nueva venta.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }
}
