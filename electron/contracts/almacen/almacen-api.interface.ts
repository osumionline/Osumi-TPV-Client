import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
} from '@desktop-contracts/almacen/inventario-report.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';

/**
 * Expone los casos de uso disponibles del módulo Almacén.
 */
export default interface AlmacenApi {
  /**
   * Recupera una página filtrada del inventario y sus agregados globales.
   */
  searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado>;

  /**
   * Exporta a CSV el conjunto persistido filtrado.
   */
  exportInventarioCsv(consulta: InventarioReportConsulta): Promise<InventarioCsvExportResult>;

  /**
   * Persiste una única fila modificada de Inventario.
   */
  saveInventarioRow(command: InventarioSaveCommand): Promise<void>;

  /**
   * Persiste atómicamente todas las filas modificadas.
   */
  saveInventarioRows(commands: readonly InventarioSaveCommand[]): Promise<void>;

  /**
   * Da de baja lógicamente un artículo desde Inventario.
   */
  deactivateArticulo(idArticulo: number): Promise<void>;
}
