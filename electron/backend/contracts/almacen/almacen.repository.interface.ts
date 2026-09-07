import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';

/**
 * Define el acceso a los datos operativos del módulo Almacén.
 */
export default interface AlmacenRepository {
  /**
   * Recupera una página de Inventario y los agregados
   * correspondientes al conjunto filtrado completo.
   */
  searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord>;

  /**
   * Persiste varias filas de Inventario dentro de una única transacción.
   */
  saveInventarioRows(commands: readonly InventarioSaveRecord[]): Promise<void>;

  /**
   * Da de baja un artículo y sus códigos activos.
   */
  deactivateArticulo(idArticulo: number): Promise<void>;
}
