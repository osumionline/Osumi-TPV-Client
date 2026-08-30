import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';

export default interface ArticulosApi {
  /**
   * Obtiene el detalle de un artículo activo.
   */
  getById(idArticulo: number): Promise<ArticuloInterface | null>;

  /**
   * Resuelve un localizador, acceso directo o código de barras
   * y devuelve el artículo correspondiente.
   */
  resolveByCode(codigo: string): Promise<ArticuloInterface | null>;
}
