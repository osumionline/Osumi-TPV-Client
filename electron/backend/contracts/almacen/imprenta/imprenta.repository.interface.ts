import type ImprentaArticuloSearchRecord from '@backend/domain/almacen/imprenta/imprenta-articulo-search-record.interface';
import type ImprentaPrintArticuloRecord from '@backend/domain/almacen/imprenta/imprenta-print-articulo-record.interface';

/**
 * Define las lecturas persistidas utilizadas por Imprenta.
 */
export default interface ImprentaRepository {
  /**
   * Busca artículos activos para el diseñador de Imprenta,
   * excluyendo los que ya formen parte del diseño.
   */
  searchImprentaArticulos(
    texto: string,
    idsArticulosExcluidos: readonly number[],
  ): Promise<readonly ImprentaArticuloSearchRecord[]>;

  /**
   * Recupera el estado persistido actual de los artículos
   * que van a materializarse en una hoja de etiquetas.
   */
  getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloRecord[]>;
}
