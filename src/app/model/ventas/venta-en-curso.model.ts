import type Empleado from '@model/empleados/empleado.model';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import { MICROS_PER_CENT } from '@model/ventas/ventas-money.constants';

/**
 * Representa una venta temporal que existe únicamente durante la sesión de trabajo.
 */
export default class VentaEnCurso {
  readonly idTemporal: string = crypto.randomUUID();

  empleado: Empleado | null = null;
  lineas: VentaLineaEnCurso[] = [];

  constructor(readonly numero: number) {}

  /**
   * Obtiene el importe total de todas las líneas en microeuros.
   */
  get totalMicros(): number {
    return this.lineas.reduce(
      (total: number, linea: VentaLineaEnCurso): number => total + linea.importeFinalMicros,
      0,
    );
  }

  /**
   * Obtiene el total final de la venta redondeado a céntimos.
   */
  get totalCents(): number {
    const sign: number = this.totalMicros < 0 ? -1 : 1;

    return sign * Math.round(Math.abs(this.totalMicros) / MICROS_PER_CENT);
  }

  /**
   * Asigna el empleado responsable de la venta.
   */
  setEmpleado(empleado: Empleado): void {
    this.empleado = empleado;
  }

  /**
   * Añade una línea real a la venta.
   */
  addLinea(linea: VentaLineaEnCurso): void {
    this.lineas.push(linea);
  }

  /**
   * Elimina una línea real mediante su identificador temporal.
   */
  removeLinea(lineaIdTemporal: string): void {
    this.lineas = this.lineas.filter(
      (linea: VentaLineaEnCurso): boolean => linea.idTemporal !== lineaIdTemporal,
    );
  }
}
