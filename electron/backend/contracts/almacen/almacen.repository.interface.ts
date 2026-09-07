import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';

/**
 * Define el acceso a los datos operativos del módulo Almacén.
 */
export default interface AlmacenRepository {
  /**
   * Recupera una página de Inventario y los agregados
   * correspondientes al conjunto filtrado completo.
   */
  searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord>;
}
