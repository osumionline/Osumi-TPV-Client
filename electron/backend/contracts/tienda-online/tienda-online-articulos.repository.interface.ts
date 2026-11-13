import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';

/**
 * Consulta de artículos locales para sincronizar
 * pedidos de cualquier tienda online compatible.
 */
export default interface TiendaOnlineArticulosRepository {
  /**
   * Busca exclusivamente por localizador exacto.
   * No interpreta accesos directos ni códigos de barras.
   */
  findByLocalizador(localizador: number): Promise<ArticuloVentaRecord | null>;
}
