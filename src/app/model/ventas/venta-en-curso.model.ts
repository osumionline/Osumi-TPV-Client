import { PERCENT_TOTAL } from '@constants/percentage.constants';
import type Cliente from '@model/clientes/cliente.model';
import type Empleado from '@model/empleados/empleado.model';
import type VentaDevolucionOrigen from '@model/ventas/venta-devolucion-origen.interface';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type VentaReservaOrigen from '@model/ventas/venta-reserva-origen.interface';
import { microsToCents } from '@utils/money.utils';
import { percentToBps } from '@utils/percentage.utils';

/**
 * Representa una venta temporal que existe únicamente durante la sesión de trabajo.
 */
export default class VentaEnCurso {
  readonly idTemporal: string = crypto.randomUUID();

  empleado: Empleado | null = null;
  cliente: Cliente | null = null;
  devolucionOrigen: VentaDevolucionOrigen | null = null;
  reservasOrigen: readonly VentaReservaOrigen[] = [];
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
    return microsToCents(this.totalMicros);
  }

  /**
   * Indica si esta venta procede de una o varias reservas.
   */
  get tieneReservas(): boolean {
    return this.reservasOrigen.length > 0;
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
    if (this.tieneReservas) {
      throw new Error(
        'No se puede cambiar el cliente mientras haya reservas cargadas en la venta.',
      );
    }
    const descuentoClienteBps: number = this.getDescuentoClienteBps(cliente);

    this.cliente = cliente;

    for (const linea of this.lineas) {
      if (!linea.esDevolucion && !linea.esReserva) {
        linea.setDescuentoClienteBps(descuentoClienteBps);
      }
    }
  }

  /**
   * Elimina el cliente de la venta y su capa de descuento.
   */
  clearCliente(): void {
    if (this.tieneReservas) {
      throw new Error(
        'No se puede eliminar el cliente mientras haya reservas cargadas en la venta.',
      );
    }
    this.cliente = null;

    for (const linea of this.lineas) {
      if (!linea.esDevolucion && !linea.esReserva) {
        linea.setDescuentoClienteBps(0);
      }
    }
  }

  /**
   * Añade una línea real a la venta.
   */
  addLinea(linea: VentaLineaEnCurso): void {
    if (linea.esReserva) {
      throw new Error('Las líneas procedentes de reserva deben cargarse mediante setReservas().');
    }

    if (this.cliente !== null && !linea.esDevolucion) {
      linea.setDescuentoClienteBps(this.getDescuentoClienteBps(this.cliente));
    }

    this.lineas.push(linea);
  }

  /**
   * Inicializa esta venta a partir de una o varias reservas
   * pertenecientes al mismo cliente.
   */
  setReservas(
    cliente: Cliente,
    reservasOrigen: readonly VentaReservaOrigen[],
    lineas: readonly VentaLineaEnCurso[],
  ): void {
    if (reservasOrigen.length === 0) {
      throw new Error('Debe indicarse al menos una reserva.');
    }

    if (this.lineas.length > 0 || this.tieneReservas) {
      throw new Error('Las reservas solo pueden cargarse sobre una venta nueva.');
    }

    if (cliente.id === null || cliente.publicId === null) {
      throw new Error('Las reservas requieren un cliente persistido.');
    }

    const clientePublicId: string = cliente.publicId;

    const reservaPublicIds: Set<string> = new Set<string>();

    for (const reserva of reservasOrigen) {
      if (reserva.idCliente !== cliente.id || reserva.clientePublicId !== clientePublicId) {
        throw new Error('Todas las reservas deben pertenecer al mismo cliente de la venta.');
      }

      if (reservaPublicIds.has(reserva.publicId)) {
        throw new Error('No se puede cargar dos veces la misma reserva.');
      }

      reservaPublicIds.add(reserva.publicId);
    }

    if (lineas.length === 0) {
      throw new Error('Las reservas seleccionadas no contienen líneas.');
    }

    for (const linea of lineas) {
      const lineaOrigen = linea.reservaOrigen;

      if (lineaOrigen === null) {
        throw new Error('Todas las líneas deben proceder de una reserva.');
      }

      const reservaOrigen: VentaReservaOrigen | undefined = reservasOrigen.find(
        (reserva: VentaReservaOrigen): boolean =>
          reserva.id === lineaOrigen.reservaId && reserva.publicId === lineaOrigen.reservaPublicId,
      );

      if (reservaOrigen === undefined) {
        throw new Error('Una línea no pertenece a ninguna de las reservas indicadas.');
      }

      const lineaExiste: boolean = reservaOrigen.lineas.some(
        (origen): boolean =>
          origen.lineaId === lineaOrigen.lineaId &&
          origen.lineaPublicId === lineaOrigen.lineaPublicId,
      );

      if (!lineaExiste) {
        throw new Error('Una línea de reserva no coincide con su origen histórico.');
      }
    }

    /*
     * Asignación directa intencionada:
     *
     * no utilizamos setCliente(), porque eso aplicaría
     * el descuento actual del cliente a las líneas.
     */
    this.cliente = cliente;

    this.reservasOrigen = [...reservasOrigen];

    this.lineas = [...lineas];
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

    /*
     * reservasOrigen NO se modifica.
     *
     * Ventas 11 necesitará conocer las líneas
     * originalmente reservadas aunque el usuario
     * haya eliminado alguna de la venta final.
     */
  }

  /**
   * Convierte el descuento porcentual de un cliente a puntos básicos.
   */
  private getDescuentoClienteBps(cliente: Cliente): number {
    if (
      !Number.isFinite(cliente.descuento) ||
      cliente.descuento < 0 ||
      cliente.descuento > PERCENT_TOTAL
    ) {
      throw new RangeError(
        `El descuento del cliente debe estar comprendido entre 0 y ${PERCENT_TOTAL} %.`,
      );
    }

    return percentToBps(cliente.descuento);
  }
}
