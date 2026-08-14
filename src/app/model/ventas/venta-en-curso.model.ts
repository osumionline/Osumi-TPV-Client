import type Cliente from '@model/clientes/cliente.model';
import type Empleado from '@model/empleados/empleado.model';
import type VentaDevolucionOrigen from '@model/ventas/venta-devolucion-origen.interface';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import { MICROS_PER_CENT } from '@model/ventas/ventas-money.constants';

/**
 * Representa una venta temporal que existe únicamente durante la sesión de trabajo.
 */
export default class VentaEnCurso {
  readonly idTemporal: string = crypto.randomUUID();

  empleado: Empleado | null = null;
  cliente: Cliente | null = null;
  devolucionOrigen: VentaDevolucionOrigen | null = null;
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
   * Asigna un cliente a la venta y actualiza su descuento en todas las líneas.
   */
  setCliente(cliente: Cliente): void {
    const descuentoClienteBps: number = this.getDescuentoClienteBps(cliente);

    this.cliente = cliente;

    for (const linea of this.lineas) {
      if (!linea.esDevolucion) {
        linea.setDescuentoClienteBps(descuentoClienteBps);
      }
    }
  }

  /**
   * Elimina el cliente de la venta y su capa de descuento.
   */
  clearCliente(): void {
    this.cliente = null;

    for (const linea of this.lineas) {
      if (!linea.esDevolucion) {
        linea.setDescuentoClienteBps(0);
      }
    }
  }

  /**
   * Añade una línea real a la venta.
   */
  addLinea(linea: VentaLineaEnCurso): void {
    if (this.cliente !== null && !linea.esDevolucion) {
      linea.setDescuentoClienteBps(this.getDescuentoClienteBps(this.cliente));
    }

    this.lineas.push(linea);
  }

  /**
   * Sustituye las líneas de devolución actuales por una nueva
   * selección perteneciente al mismo ticket de origen.
   */
  setDevolucion(origen: VentaDevolucionOrigen, lineas: readonly VentaLineaEnCurso[]): void {
    if (this.devolucionOrigen !== null && this.devolucionOrigen.id !== origen.id) {
      throw new Error(
        'No se puede iniciar una devolución de otro ticket mientras exista una devolución en curso.',
      );
    }

    if (lineas.some((linea: VentaLineaEnCurso): boolean => !linea.esDevolucion)) {
      throw new Error('Todas las líneas indicadas deben ser líneas de devolución.');
    }

    const lineasNormales: readonly VentaLineaEnCurso[] = this.lineas.filter(
      (linea: VentaLineaEnCurso): boolean => !linea.esDevolucion,
    );

    this.lineas = [...lineasNormales, ...lineas];

    this.devolucionOrigen = lineas.length === 0 ? null : origen;
  }

  /**
   * Elimina una línea real mediante su identificador temporal.
   */
  removeLinea(lineaIdTemporal: string): void {
    this.lineas = this.lineas.filter(
      (linea: VentaLineaEnCurso): boolean => linea.idTemporal !== lineaIdTemporal,
    );

    if (!this.lineas.some((linea: VentaLineaEnCurso): boolean => linea.esDevolucion)) {
      this.devolucionOrigen = null;
    }
  }

  /**
   * Convierte el descuento porcentual de un cliente a puntos básicos.
   */
  private getDescuentoClienteBps(cliente: Cliente): number {
    if (!Number.isFinite(cliente.descuento) || cliente.descuento < 0 || cliente.descuento > 100) {
      throw new RangeError('El descuento del cliente debe estar comprendido entre 0 y 100 %.');
    }

    return Math.round(cliente.descuento * 100);
  }
}
