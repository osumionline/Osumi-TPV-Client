import { Service } from '@angular/core';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';

/**
 * Proporciona al renderer las consultas necesarias
 * para realizar devoluciones de ventas históricas.
 */
@Service()
export default class VentasDevolucionesService {
  /**
   * Recupera una venta histórica mediante su identificador interno.
   */
  async getDevolucion(idVenta: number): Promise<VentaDevolucionInterface | null> {
    return window.osumiDesktop.ventas.getDevolucion(idVenta);
  }
}
