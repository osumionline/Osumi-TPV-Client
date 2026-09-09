import type InventarioFilterQuery from '@backend/contracts/almacen/inventario/inventario-filter-query.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario/inventario-query.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario/inventario-record.interface';
import type { InventarioReportRecord } from '@backend/domain/almacen/inventario/inventario-report-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario/inventario-save-record.interface';

/**
 * Define el acceso a los datos operativos de Inventario.
 */
export default interface InventarioRepository {
  /**
   * Recupera una página de Inventario y los agregados
   * correspondientes al conjunto filtrado completo.
   */
  searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord>;

  /**
   * Recupera el conjunto persistido completo utilizado
   * por exportaciones e impresión de Inventario.
   */
  getInventarioReport(query: InventarioFilterQuery): Promise<InventarioReportRecord>;

  /**
   * Persiste varias filas de Inventario dentro
   * de una única transacción.
   */
  saveInventarioRows(commands: readonly InventarioSaveRecord[]): Promise<void>;

  /**
   * Da de baja un artículo y sus códigos activos
   * desde Inventario.
   */
  deactivateArticulo(idArticulo: number): Promise<void>;
}
