import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';

/**
 * Representa un acceso directo disponible para seleccionar rápidamente un artículo.
 */
export default class AccesoDirectoVenta {
  id: number = 0;
  publicId: string = '';
  accesoDirecto: number = 0;
  nombre: string = '';

  /**
   * Carga el modelo a partir del contrato recibido desde Electron.
   */
  fromInterface(acceso: AccesoDirectoVentaInterface): AccesoDirectoVenta {
    this.id = acceso.id;
    this.publicId = acceso.publicId;
    this.accesoDirecto = acceso.accesoDirecto;
    this.nombre = acceso.nombre;

    return this;
  }
}
