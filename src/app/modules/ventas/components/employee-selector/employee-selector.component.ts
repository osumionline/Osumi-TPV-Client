import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type Empleado from '@model/empleados/empleado.model';

/**
 * Permite elegir qué empleado atenderá una venta
 * todavía pendiente de responsable.
 */
@Component({
  selector: 'otpv-employee-selector',
  templateUrl: './employee-selector.component.html',
  styleUrl: './employee-selector.component.scss',
})
export default class EmployeeSelectorComponent {
  readonly empleados: InputSignal<readonly Empleado[]> = input.required<readonly Empleado[]>();

  readonly selectEvent: OutputEmitterRef<Empleado> = output<Empleado>();

  /**
   * Selecciona el empleado indicado.
   */
  select(empleado: Empleado): void {
    this.selectEvent.emit(empleado);
  }
}
