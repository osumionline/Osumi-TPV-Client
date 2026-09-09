import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import type { CaducidadReportConsulta } from '@desktop-contracts/almacen/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidad.interface';
import type {
  ImprentaArticuloSearchConsulta,
  ImprentaArticuloSearchInterface,
} from '@desktop-contracts/almacen/imprenta-articulo.interface';
import type { ImprentaPrintCommand } from '@desktop-contracts/almacen/imprenta-print.interface';
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
   * Abre una vista independiente del inventario persistido.
   */
  openInventarioPrint(consulta: InventarioReportConsulta): Promise<void>;

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

  /**
   * Recupera una página filtrada de caducidades
   * y sus totales globales.
   */
  searchCaducidades(consulta: CaducidadConsulta): Promise<CaducidadResultado>;

  /**
   * Recupera años y marcas disponibles para
   * filtrar caducidades.
   */
  getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsInterface>;

  /**
   * Busca artículos activos para una nueva caducidad.
   */
  searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchInterface[]>;

  /**
   * Registra una nueva pérdida por caducidad.
   */
  createCaducidad(command: CaducidadCreateCommand): Promise<void>;

  /**
   * Abre el informe agregado de Caducidades.
   */
  openCaducidadReport(consulta: CaducidadReportConsulta): Promise<void>;

  /**
   * Revierte una pérdida por caducidad.
   */
  deactivateCaducidad(idCaducidad: number): Promise<void>;

  /**
   * Busca artículos activos para el diseñador de Imprenta.
   */
  searchImprentaArticulos(
    consulta: ImprentaArticuloSearchConsulta,
  ): Promise<readonly ImprentaArticuloSearchInterface[]>;

  /**
   * Materializa y abre una hoja canónica de etiquetas.
   */
  openImprentaPrint(command: ImprentaPrintCommand): Promise<void>;
}
