import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';

/**
 * Representa un artículo con los datos necesarios para incorporarlo a una venta.
 */
export default class ArticuloVenta {
  id: number = 0;
  publicId: string = '';
  localizador: number = 0;
  nombre: string = '';
  marca: string = '';
  pucMicros: number = 0;
  pvpCents: number = 0;
  pvpDescuentoCents: number | null = null;
  ivaBps: number = 0;
  stock: number = 0;
  fechaCaducidad: string | null = null;
  observaciones: string | null = null;
  mostrarObservacionesVentas: boolean = false;

  /**
   * Carga el modelo a partir del contrato recibido desde Electron.
   */
  fromInterface(articulo: ArticuloVentaInterface): ArticuloVenta {
    this.id = articulo.id;
    this.publicId = articulo.publicId;
    this.localizador = articulo.localizador;
    this.nombre = articulo.nombre;
    this.marca = articulo.marca;
    this.pucMicros = articulo.pucMicros;
    this.pvpCents = articulo.pvpCents;
    this.pvpDescuentoCents = articulo.pvpDescuentoCents;
    this.ivaBps = articulo.ivaBps;
    this.stock = articulo.stock;
    this.fechaCaducidad = articulo.fechaCaducidad;
    this.observaciones = articulo.observaciones;
    this.mostrarObservacionesVentas = articulo.mostrarObservacionesVentas;

    return this;
  }
}
