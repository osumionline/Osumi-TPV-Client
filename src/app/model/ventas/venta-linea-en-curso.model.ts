import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import type VentaVariosData from '@model/ventas/venta-varios-data.interface';
import { BASIS_POINTS_TOTAL, MICROS_PER_CENT } from '@model/ventas/ventas-money.constants';

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
    this.pvpMicros = articulo.pvpCents * MICROS_PER_CENT;
    this.pvpDescuentoMicros =
      articulo.pvpDescuentoCents === null ? null : articulo.pvpDescuentoCents * MICROS_PER_CENT;
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
   * Indica si la línea representa una entrada libre Varios.
   */
  get esVarios(): boolean {
    return this.idArticulo === null && this.articuloPublicId === null && this.localizador === 0;
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
   * Establece la cantidad de unidades de la línea.
   */
  setCantidad(cantidad: number): void {
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
    this.regalo = regalo;
  }

  /**
   * Sustituye el importe calculado de la línea por un importe manual.
   */
  setImporteManualMicros(importeManualMicros: number): void {
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
    this.importeManualMicros = null;
  }

  /**
   * Establece el descuento porcentual procedente del cliente de la venta.
   *
   * Esta capa puede cambiar independientemente del resto de modificaciones
   * económicas porque queda oculta mientras exista una capa con mayor prioridad.
   */
  setDescuentoClienteBps(descuentoClienteBps: number): void {
    this.requireValidDescuentoBps(descuentoClienteBps, 'descuento del cliente');

    this.descuentoClienteBps = descuentoClienteBps;
  }

  /**
   * Establece un descuento porcentual manual sobre la línea.
   */
  setDescuentoManualBps(descuentoManualBps: number): void {
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
    this.descuentoManualBps = null;
  }

  /**
   * Establece un importe fijo de descuento sobre la línea.
   */
  setDescuentoDirectoMicros(descuentoDirectoMicros: number): void {
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
    this.descuentoDirectoMicros = null;
  }

  /**
   * Elimina el precio promocional con el que el artículo entró en la venta.
   */
  clearDescuentoPromocional(): void {
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

    const descuentoMicros: number = this.importeBaseMicros * this.descuentoBps;

    return this.roundDivision(descuentoMicros, BASIS_POINTS_TOTAL);
  }

  /**
   * Obtiene el importe final de la línea en microeuros.
   */
  get importeFinalMicros(): number {
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
      throw new RangeError(`El ${field} debe estar comprendido entre 0 y 100 %.`);
    }
  }

  /**
   * Comprueba que un IVA expresado en puntos básicos sea válido.
   */
  private requireValidIvaBps(ivaBps: number): void {
    if (!Number.isSafeInteger(ivaBps) || ivaBps < 0 || ivaBps > BASIS_POINTS_TOTAL) {
      throw new RangeError('El IVA debe estar comprendido entre 0 y 100 %.');
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
   * Redondea una división de enteros de forma simétrica para valores positivos y negativos.
   */
  private roundDivision(value: number, divisor: number): number {
    const sign: number = value < 0 ? -1 : 1;

    return sign * Math.round(Math.abs(value) / divisor);
  }
}
