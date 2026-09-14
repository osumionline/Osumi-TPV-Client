import { Service } from '@angular/core';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import AccesoDirectoVenta from '@model/ventas/acceso-directo-venta.model';
import ArticuloVenta from '@model/ventas/articulo-venta.model';

/**
 * Proporciona las consultas de artículos necesarias durante una venta.
 */
@Service()
export default class VentasArticulosService {
  /**
   * Resuelve un código introducido o escaneado y devuelve su artículo.
   */
  async resolveArticulo(codigo: string): Promise<ArticuloVenta | null> {
    const result: ArticuloVentaInterface | null =
      await window.osumiDesktop.ventas.resolveArticulo(codigo);

    return result === null ? null : new ArticuloVenta().fromInterface(result);
  }

  /**
   * Busca artículos que coincidan con el texto indicado.
   */
  async search(query: string): Promise<readonly ArticuloVenta[]> {
    const result: readonly ArticuloVentaInterface[] =
      await window.osumiDesktop.ventas.searchArticulos(query);

    return result.map((articulo: ArticuloVentaInterface): ArticuloVenta =>
      new ArticuloVenta().fromInterface(articulo),
    );
  }

  /**
   * Obtiene los accesos directos disponibles para seleccionar artículos.
   */
  async getAccesosDirectos(): Promise<readonly AccesoDirectoVenta[]> {
    const result: readonly AccesoDirectoVentaInterface[] =
      await window.osumiDesktop.ventas.getAccesosDirectos();

    return result.map((acceso: AccesoDirectoVentaInterface): AccesoDirectoVenta =>
      new AccesoDirectoVenta().fromInterface(acceso),
    );
  }
}
