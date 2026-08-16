import { BASIS_POINTS_TOTAL, PERCENT_TOTAL } from '@constants/percentage.constants';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { ReservaLineaInterface } from '@desktop-contracts/reservas/reserva.interface';
import type { VentaDevolucionLineaInterface } from '@desktop-contracts/ventas/venta-devolucion.interface';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import type VentaLineaDevolucionOrigen from '@model/ventas/venta-linea-devolucion-origen.interface';
import type VentaLineaReservaOrigen from '@model/ventas/venta-linea-reserva-origen.interface';
import type VentaVariosData from '@model/ventas/venta-varios-data.interface';
import {
  calculateBpsAmountMicros,
  calculateProportionalMicros,
  centsToMicros,
} from '@utils/money.utils';

/**
 * Representa una línea real de una venta que todavía no ha sido finalizada.
 */
export default class VentaLineaEnCurso {
  readonly idTemporal: string = crypto.randomUUID();

  idArticulo: number | null = null;
  articuloPublicId: string | null = null;
  localizador: number | null = null;
  descripcion: string = '';
  marca: string = '';
  stock: number | null = null;
  cantidad: number = 1;

  pucMicros: number = 0;
  pvpMicros: number = 0;
  pvpDescuentoMicros: number | null = null;
  importeManualMicros: number | null = null;
  descuentoClienteBps: number = 0;
  descuentoManualBps: number | null = null;
  descuentoDirectoMicros: number | null = null;

  ivaBps: number = 0;
  observaciones: string | null = null;
  regalo: boolean = false;
  devolucionOrigen: VentaLineaDevolucionOrigen | null = null;
  reservaOrigen: VentaLineaReservaOrigen | null = null;

  /**
   * Inicializa la línea a partir de un artículo seleccionado para la venta.
   */
  fromArticulo(articulo: ArticuloVenta): VentaLineaEnCurso {
    this.idArticulo = articulo.id;
    this.articuloPublicId = articulo.publicId;
    this.localizador = articulo.localizador;
    this.descripcion = articulo.nombre;
    this.marca = articulo.marca;
    this.stock = articulo.stock;
    this.cantidad = 1;
    this.pucMicros = articulo.pucMicros;
    this.pvpMicros = centsToMicros(articulo.pvpCents);
    this.pvpDescuentoMicros =
      articulo.pvpDescuentoCents === null ? null : centsToMicros(articulo.pvpDescuentoCents);
    this.ivaBps = articulo.ivaBps;
    this.observaciones = articulo.mostrarObservacionesVentas ? articulo.observaciones : null;

    return this;
  }

  /**
   * Inicializa la línea como una entrada libre de tipo Varios.
   */
  fromVarios(data: VentaVariosData): VentaLineaEnCurso {
    this.idArticulo = null;
    this.articuloPublicId = null;
    this.localizador = 0;
    this.marca = 'Varios';
    this.stock = null;
    this.cantidad = 1;

    this.pucMicros = 0;
    this.pvpDescuentoMicros = null;
    this.importeManualMicros = null;
    this.descuentoClienteBps = 0;
    this.descuentoManualBps = null;
    this.descuentoDirectoMicros = null;
    this.observaciones = null;
    this.regalo = false;

    this.setDatosVarios(data);

    return this;
  }

  /**
   * Inicializa la línea como devolución de una línea histórica.
   */
  fromDevolucion(linea: VentaDevolucionLineaInterface, unidades: number): VentaLineaEnCurso {
    if (!Number.isSafeInteger(linea.unidades) || linea.unidades <= 0) {
      throw new RangeError('La línea original no contiene una cantidad válida para devolver.');
    }

    if (
      !Number.isSafeInteger(linea.unidadesDevueltas) ||
      linea.unidadesDevueltas < 0 ||
      linea.unidadesDevueltas > linea.unidades
    ) {
      throw new RangeError('Las unidades ya devueltas de la línea original no son válidas.');
    }

    if (
      !Number.isSafeInteger(linea.unidadesDisponibles) ||
      linea.unidadesDisponibles < 0 ||
      linea.unidadesDisponibles > linea.unidades - linea.unidadesDevueltas
    ) {
      throw new RangeError('Las unidades disponibles para devolución no son válidas.');
    }

    if (!Number.isSafeInteger(linea.importeMicros) || linea.importeMicros < 0) {
      throw new RangeError('El importe histórico de la línea no es válido para una devolución.');
    }

    this.idArticulo = linea.idArticulo;
    this.articuloPublicId = linea.articuloPublicId;

    this.localizador = linea.localizador;
    this.descripcion = linea.nombre;

    /*
     * La consulta histórica no necesita recuperar la marca.
     * La devolución se identificará visualmente como tal en 8C.
     */
    this.marca = '';
    this.stock = null;

    this.pucMicros = linea.pucMicros;
    this.pvpMicros = linea.pvpMicros;
    this.ivaBps = linea.ivaBps;

    /*
     * Las capas económicas normales quedan deliberadamente vacías.
     * Una devolución utiliza exclusivamente su importe histórico.
     */
    this.pvpDescuentoMicros = null;
    this.importeManualMicros = null;
    this.descuentoClienteBps = 0;
    this.descuentoManualBps = null;
    this.descuentoDirectoMicros = null;

    this.observaciones = null;
    this.regalo = linea.regalo;

    this.devolucionOrigen = {
      id: linea.id,
      publicId: linea.publicId,

      unidadesOriginales: linea.unidades,
      unidadesDevueltasPrevias: linea.unidadesDevueltas,
      unidadesDisponibles: linea.unidadesDisponibles,

      importeOriginalMicros: linea.importeMicros,

      descuentoBps: linea.descuentoBps,
      importeDescuentoMicros: linea.importeDescuentoMicros,

      regalo: linea.regalo,
    };

    this.setUnidadesDevolucion(unidades);

    return this;
  }

  /**
   * Inicializa una línea a partir de una línea histórica
   * perteneciente a una reserva.
   */
  fromReserva(reserva: ReservaInterface, linea: ReservaLineaInterface): VentaLineaEnCurso {
    if (reserva.publicId.trim() === '') {
      throw new Error('La reserva no dispone de un identificador válido.');
    }

    if (linea.publicId.trim() === '') {
      throw new Error('La línea de reserva no dispone de un identificador válido.');
    }

    if (!Number.isSafeInteger(linea.unidades) || linea.unidades <= 0) {
      throw new RangeError('Las unidades reservadas deben ser un entero mayor que cero.');
    }

    this.requireNonNegativeMicros(linea.pucMicros, 'PUC de la línea reservada');

    this.requireNonNegativeMicros(linea.pvpMicros, 'PVP de la línea reservada');

    this.requireNonNegativeMicros(linea.importeMicros, 'importe histórico de la reserva');

    this.requireNonNegativeMicros(
      linea.importeDescuentoMicros,
      'descuento histórico de la reserva',
    );

    this.requireValidIvaBps(linea.ivaBps);

    this.requireValidDescuentoBps(linea.descuentoBps, 'descuento histórico de la reserva');

    this.idArticulo = linea.idArticulo;

    this.articuloPublicId = linea.articuloPublicId;

    this.localizador = linea.localizador;

    this.descripcion = linea.nombre;

    this.marca = linea.marca ?? '';

    /*
     * No mostramos un stock concreto para la línea
     * reservada porque su stock ya fue inmovilizado
     * al crear la reserva.
     */
    this.stock = null;

    this.pucMicros = linea.pucMicros;

    this.pvpMicros = linea.pvpMicros;

    this.ivaBps = linea.ivaBps;

    /*
     * Las capas económicas ordinarias quedan vacías.
     * El importe final procederá exclusivamente
     * del histórico de la reserva.
     */
    this.pvpDescuentoMicros = null;
    this.importeManualMicros = null;

    this.descuentoClienteBps = 0;
    this.descuentoManualBps = null;
    this.descuentoDirectoMicros = null;

    this.observaciones = null;
    this.regalo = false;

    this.devolucionOrigen = null;

    this.reservaOrigen = {
      reservaId: reserva.id,
      reservaPublicId: reserva.publicId,

      lineaId: linea.id,
      lineaPublicId: linea.publicId,

      idArticulo: linea.idArticulo,

      articuloPublicId: linea.articuloPublicId,

      unidadesReservadas: linea.unidades,

      importeReservadoMicros: linea.importeMicros,

      descuentoBps: linea.descuentoBps,

      importeDescuentoReservadoMicros: linea.importeDescuentoMicros,
    };

    this.setCantidadReserva(linea.unidades);

    return this;
  }

  /**
   * Indica si la línea representa una entrada libre Varios.
   */
  get esVarios(): boolean {
    return (
      !this.esDevolucion &&
      !this.esReserva &&
      this.idArticulo === null &&
      this.articuloPublicId === null &&
      this.localizador === 0
    );
  }

  /**
   * Indica si la línea procede de una venta histórica.
   */
  get esDevolucion(): boolean {
    return this.devolucionOrigen !== null;
  }

  /**
   * Indica si la línea procede de una reserva.
   */
  get esReserva(): boolean {
    return this.reservaOrigen !== null;
  }

  /**
   * Modifica los datos propios de una línea Varios sin alterar
   * cantidad, regalo ni las diferentes capas de descuento.
   */
  setDatosVarios(data: VentaVariosData): void {
    if (!this.esVarios) {
      throw new Error('Solo se pueden modificar como Varios las líneas de tipo Varios.');
    }

    const descripcion: string = data.descripcion.trim();

    if (descripcion.length === 0 || descripcion.length > 200) {
      throw new RangeError('La descripción de un Varios debe contener entre 1 y 200 caracteres.');
    }

    this.requireNonNegativeMicros(data.pvpMicros, 'PVP del Varios');

    this.requireValidIvaBps(data.ivaBps);

    const importeBaseMicros: number = this.cantidad * data.pvpMicros;

    if (this.descuentoDirectoMicros !== null && this.descuentoDirectoMicros > importeBaseMicros) {
      throw new RangeError(
        'El PVP indicado dejaría el descuento directo por encima del importe de la línea.',
      );
    }

    this.descripcion = descripcion;
    this.pvpMicros = data.pvpMicros;
    this.ivaBps = data.ivaBps;
  }

  /**
   * Indica si la línea conserva el precio promocional del artículo.
   */
  get tieneDescuentoPromocional(): boolean {
    return this.pvpDescuentoMicros !== null;
  }

  /**
   * Obtiene el descuento derivado del precio promocional para todas las unidades de la línea.
   */
  get importeDescuentoPromocionalMicros(): number {
    if (this.pvpDescuentoMicros === null) {
      return 0;
    }

    const descuentoUnitarioMicros: number = this.pvpMicros - this.pvpDescuentoMicros;

    return this.cantidad * descuentoUnitarioMicros;
  }

  /**
   * Obtiene el descuento porcentual efectivo de la línea.
   *
   * El descuento manual, cuando existe, tiene prioridad sobre el descuento del cliente.
   */
  get descuentoBps(): number {
    return this.descuentoManualBps ?? this.descuentoClienteBps;
  }

  /**
   * Indica si existe un descuento porcentual introducido manualmente.
   */
  get tieneDescuentoManual(): boolean {
    return this.descuentoManualBps !== null;
  }

  /**
   * Obtiene el número positivo de unidades que se están devolviendo.
   */
  get unidadesDevolucion(): number {
    return this.esDevolucion ? -this.cantidad : 0;
  }

  /**
   * Cambia las unidades de una línea de devolución.
   */
  setUnidadesDevolucion(unidades: number): void {
    const origen: VentaLineaDevolucionOrigen | null = this.devolucionOrigen;

    if (origen === null) {
      throw new Error('La línea indicada no es una devolución.');
    }

    if (!Number.isSafeInteger(unidades) || unidades <= 0 || unidades > origen.unidadesDisponibles) {
      throw new RangeError(
        `Solo se pueden devolver entre 1 y ${origen.unidadesDisponibles} unidades.`,
      );
    }

    this.cantidad = -unidades;
  }

  /**
   * Modifica la cantidad finalmente adquirida
   * de una línea procedente de reserva.
   *
   * Puede ser menor, igual o mayor que la cantidad
   * originalmente reservada.
   */
  setCantidadReserva(cantidad: number): void {
    const origen: VentaLineaReservaOrigen | null = this.reservaOrigen;

    if (origen === null) {
      throw new Error('La línea indicada no procede de una reserva.');
    }

    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      throw new RangeError('La cantidad de una línea reservada debe ser un entero mayor que cero.');
    }

    /*
     * Validamos también que los cálculos económicos
     * sigan dentro del rango seguro antes de modificar
     * realmente la cantidad.
     */
    calculateProportionalMicros(origen.importeReservadoMicros, cantidad, origen.unidadesReservadas);

    calculateProportionalMicros(
      origen.importeDescuentoReservadoMicros,
      cantidad,
      origen.unidadesReservadas,
    );

    this.cantidad = cantidad;
  }

  /**
   * Establece la cantidad de unidades de la línea.
   */
  setCantidad(cantidad: number): void {
    this.requireNotDevolucion('modificar directamente la cantidad');

    this.requireNotReserva('modificar directamente la cantidad');

    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      throw new RangeError('La cantidad de una línea de venta debe ser un entero mayor que cero.');
    }

    const importeBaseMicros: number = cantidad * this.pvpMicros;
    if (this.descuentoDirectoMicros !== null && this.descuentoDirectoMicros > importeBaseMicros) {
      throw new RangeError(
        'La cantidad indicada dejaría el descuento directo por encima del importe de la línea.',
      );
    }

    this.cantidad = cantidad;
  }

  /**
   * Incrementa la cantidad de unidades de la línea.
   */
  incrementCantidad(): void {
    this.setCantidad(this.cantidad + 1);
  }

  /**
   * Activa o desactiva el estado de regalo.
   *
   * El resto de modificaciones económicas se conservan para poder
   * recuperarlas si posteriormente se desmarca el regalo.
   */
  setRegalo(regalo: boolean): void {
    this.requireNotDevolucion('cambiar el estado de regalo');
    this.requireNotReserva('cambiar el estado de regalo');

    this.regalo = regalo;
  }

  /**
   * Sustituye el importe calculado de la línea por un importe manual.
   */
  setImporteManualMicros(importeManualMicros: number): void {
    this.requireNotDevolucion('modificar el importe');
    this.requireNotReserva('modificar el importe');
    this.requireNonNegativeMicros(importeManualMicros, 'importe manual');

    if (this.regalo) {
      throw new Error('No se puede modificar el importe de una línea marcada como regalo.');
    }
    if (this.tieneDescuentoPromocional) {
      throw new Error(
        'No se puede establecer un importe manual mientras exista un descuento promocional.',
      );
    }
    if (this.descuentoDirectoMicros !== null) {
      throw new Error(
        'No se puede establecer un importe manual mientras exista un descuento directo.',
      );
    }

    this.importeManualMicros = importeManualMicros;
  }

  /**
   * Elimina el importe manual y recupera el cálculo normal de la línea.
   */
  clearImporteManual(): void {
    this.requireNotDevolucion('eliminar el importe manual');
    this.requireNotReserva('eliminar el importe manual');
    this.importeManualMicros = null;
  }

  /**
   * Establece el descuento porcentual procedente del cliente de la venta.
   *
   * Esta capa puede cambiar independientemente del resto de modificaciones
   * económicas porque queda oculta mientras exista una capa con mayor prioridad.
   */
  setDescuentoClienteBps(descuentoClienteBps: number): void {
    this.requireNotDevolucion('aplicar el descuento del cliente');
    this.requireNotReserva('aplicar el descuento del cliente');
    this.requireValidDescuentoBps(descuentoClienteBps, 'descuento del cliente');

    this.descuentoClienteBps = descuentoClienteBps;
  }

  /**
   * Establece un descuento porcentual manual sobre la línea.
   */
  setDescuentoManualBps(descuentoManualBps: number): void {
    this.requireNotDevolucion('modificar el descuento');
    this.requireNotReserva('modificar el descuento');
    this.requireValidDescuentoBps(descuentoManualBps, 'descuento porcentual');

    if (this.regalo) {
      throw new Error('No se puede modificar el descuento de una línea marcada como regalo.');
    }
    if (this.tieneDescuentoPromocional) {
      throw new Error(
        'No se puede establecer un descuento porcentual mientras exista un descuento promocional.',
      );
    }
    if (this.importeManualMicros !== null) {
      throw new Error('No se puede modificar el descuento mientras exista un importe manual.');
    }
    if (this.descuentoDirectoMicros !== null) {
      throw new Error(
        'No se puede modificar el descuento porcentual mientras exista un descuento directo.',
      );
    }

    this.descuentoManualBps = descuentoManualBps;
  }

  /**
   * Elimina el descuento porcentual manual y recupera el descuento del cliente.
   */
  clearDescuentoManual(): void {
    this.requireNotDevolucion('eliminar el descuento manual');
    this.requireNotReserva('eliminar el descuento manual');
    this.descuentoManualBps = null;
  }

  /**
   * Establece un importe fijo de descuento sobre la línea.
   */
  setDescuentoDirectoMicros(descuentoDirectoMicros: number): void {
    this.requireNotDevolucion('modificar el descuento');
    this.requireNotReserva('modificar el descuento');
    this.requireNonNegativeMicros(descuentoDirectoMicros, 'descuento directo');

    if (descuentoDirectoMicros === 0) {
      throw new RangeError('El descuento directo debe ser mayor que cero.');
    }
    if (descuentoDirectoMicros > this.importeBaseMicros) {
      throw new RangeError('El descuento directo no puede superar el importe base de la línea.');
    }
    if (this.regalo) {
      throw new Error('No se puede modificar el descuento de una línea marcada como regalo.');
    }
    if (this.tieneDescuentoPromocional) {
      throw new Error(
        'No se puede establecer un descuento directo mientras exista un descuento promocional.',
      );
    }
    if (this.importeManualMicros !== null) {
      throw new Error(
        'No se puede establecer un descuento directo mientras exista un importe manual.',
      );
    }

    this.descuentoManualBps = null;
    this.descuentoDirectoMicros = descuentoDirectoMicros;
  }

  /**
   * Elimina el descuento directo aplicado a la línea.
   */
  clearDescuentoDirecto(): void {
    this.requireNotDevolucion('eliminar el descuento directo');
    this.requireNotReserva('eliminar el descuento directo');
    this.descuentoDirectoMicros = null;
  }

  /**
   * Elimina el precio promocional con el que el artículo entró en la venta.
   */
  clearDescuentoPromocional(): void {
    this.requireNotDevolucion('eliminar el descuento promocional');
    this.requireNotReserva('eliminar el descuento promocional');
    this.pvpDescuentoMicros = null;
  }

  /**
   * Obtiene el importe de la línea antes de aplicar descuentos o modificaciones manuales.
   */
  get importeBaseMicros(): number {
    return this.cantidad * this.pvpMicros;
  }

  /**
   * Obtiene el importe descontado a la línea.
   */
  get importeDescuentoMicros(): number {
    if (this.regalo || this.importeManualMicros !== null) {
      return 0;
    }

    if (this.tieneDescuentoPromocional) {
      return this.importeDescuentoPromocionalMicros;
    }

    if (this.descuentoDirectoMicros !== null) {
      return this.descuentoDirectoMicros;
    }

    return calculateBpsAmountMicros(this.importeBaseMicros, this.descuentoBps);
  }

  /**
   * Obtiene el importe final correspondiente a la cantidad
   * que finalmente se comprará de una línea reservada.
   */
  get importeReservaMicros(): number {
    const origen: VentaLineaReservaOrigen | null = this.reservaOrigen;

    if (origen === null) {
      return 0;
    }

    return calculateProportionalMicros(
      origen.importeReservadoMicros,
      this.cantidad,
      origen.unidadesReservadas,
    );
  }

  /**
   * Obtiene el descuento histórico escalado a la
   * cantidad finalmente comprada.
   */
  get importeDescuentoReservaMicros(): number {
    const origen: VentaLineaReservaOrigen | null = this.reservaOrigen;

    if (origen === null) {
      return 0;
    }

    return calculateProportionalMicros(
      origen.importeDescuentoReservadoMicros,
      this.cantidad,
      origen.unidadesReservadas,
    );
  }

  /**
   * Obtiene el importe positivo que corresponde devolver
   * por las unidades seleccionadas.
   */
  get importeDevolucionMicros(): number {
    const origen: VentaLineaDevolucionOrigen | null = this.devolucionOrigen;

    if (origen === null) {
      return 0;
    }

    const unidadesSeleccionadas: number = this.unidadesDevolucion;

    const unidadesAntes: number = origen.unidadesDevueltasPrevias;

    const unidadesDespues: number = unidadesAntes + unidadesSeleccionadas;

    const importeAntes: number = calculateProportionalMicros(
      origen.importeOriginalMicros,
      unidadesAntes,
      origen.unidadesOriginales,
    );

    const importeDespues: number = calculateProportionalMicros(
      origen.importeOriginalMicros,
      unidadesDespues,
      origen.unidadesOriginales,
    );

    return importeDespues - importeAntes;
  }

  /**
   * Obtiene el importe final de la línea en microeuros.
   */
  get importeFinalMicros(): number {
    if (this.esDevolucion) {
      return -this.importeDevolucionMicros;
    }

    if (this.esReserva) {
      return this.importeReservaMicros;
    }

    if (this.regalo) {
      return 0;
    }

    if (this.importeManualMicros !== null) {
      return this.importeManualMicros;
    }

    return this.importeBaseMicros - this.importeDescuentoMicros;
  }

  /**
   * Comprueba que un descuento expresado en puntos básicos sea válido.
   */
  private requireValidDescuentoBps(descuentoBps: number, field: string): void {
    if (
      !Number.isSafeInteger(descuentoBps) ||
      descuentoBps < 0 ||
      descuentoBps > BASIS_POINTS_TOTAL
    ) {
      throw new RangeError(`El ${field} debe estar comprendido entre 0 y ${PERCENT_TOTAL} %.`);
    }
  }

  /**
   * Comprueba que un IVA expresado en puntos básicos sea válido.
   */
  private requireValidIvaBps(ivaBps: number): void {
    if (!Number.isSafeInteger(ivaBps) || ivaBps < 0 || ivaBps > BASIS_POINTS_TOTAL) {
      throw new RangeError(`El IVA debe estar comprendido entre 0 y ${PERCENT_TOTAL} %.`);
    }
  }

  /**
   * Comprueba que un importe expresado en microeuros sea válido.
   */
  private requireNonNegativeMicros(value: number, field: string): void {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(
        `El ${field} debe ser un número entero de microeuros mayor o igual a cero.`,
      );
    }
  }

  /**
   * Impide utilizar sobre una devolución operaciones económicas
   * pertenecientes a una venta ordinaria.
   */
  private requireNotDevolucion(operation: string): void {
    if (this.esDevolucion) {
      throw new Error(`No se puede ${operation} en una línea de devolución.`);
    }
  }

  /**
   * Impide aplicar operaciones económicas ordinarias
   * a una línea cuyo precio procede de una reserva.
   */
  private requireNotReserva(operation: string): void {
    if (this.esReserva) {
      throw new Error(`No se puede ${operation} en una línea procedente de reserva.`);
    }
  }
}
