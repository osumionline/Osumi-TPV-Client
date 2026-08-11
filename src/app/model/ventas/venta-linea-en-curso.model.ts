import type ArticuloVenta from '@model/ventas/articulo-venta.model';
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
  descuentoBps: number = 0;
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
   * Establece el descuento porcentual de la línea en puntos básicos.
   */
  setDescuentoBps(descuentoBps: number): void {
    if (
      !Number.isSafeInteger(descuentoBps) ||
      descuentoBps < 0 ||
      descuentoBps > BASIS_POINTS_TOTAL
    ) {
      throw new RangeError('El descuento porcentual debe estar comprendido entre 0 y 100 %.');
    }
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

    this.descuentoBps = descuentoBps;
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

    this.descuentoBps = 0;
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
