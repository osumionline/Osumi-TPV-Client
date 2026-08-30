import type { ArticuloRecord } from '@backend/domain/articulos/articulo-record.interface';

export default interface ArticulosRepository {
  /**
   * Obtiene un artículo activo mediante su identificador interno.
   */
  findById(idArticulo: number): Promise<ArticuloRecord | null>;

  /**
   * Resuelve localizador, acceso directo o código de barras
   * y devuelve el identificador del artículo activo.
   */
  resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null>;
}
