import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidad-query.interface';
import type InventarioFilterQuery from '@backend/contracts/almacen/inventario-filter-query.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadResultadoRecord,
} from '@backend/domain/almacen/caducidad-record.interface';
import type { CaducidadReportRecord } from '@backend/domain/almacen/caducidad-report-record.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';
import type { InventarioReportRecord } from '@backend/domain/almacen/inventario-report-record.interface';
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
   * Recupera el conjunto persistido completo utilizado por los reportes.
   */
  getInventarioReport(query: InventarioFilterQuery): Promise<InventarioReportRecord>;

  /**
   * Persiste varias filas de Inventario dentro de una única transacción.
   */
  saveInventarioRows(commands: readonly InventarioSaveRecord[]): Promise<void>;

  /**
   * Da de baja un artículo y sus códigos activos.
   */
  deactivateArticulo(idArticulo: number): Promise<void>;

  /**
   * Recupera una página de caducidades y los totales
   * correspondientes al conjunto filtrado completo.
   */
  searchCaducidades(query: CaducidadRepositoryQuery): Promise<CaducidadResultadoRecord>;

  /**
   * Recupera el informe histórico agregado del
   * conjunto filtrado de Caducidades.
   */
  getCaducidadReport(query: CaducidadFilterQuery): Promise<CaducidadReportRecord>;

  /**
   * Recupera las opciones históricas disponibles para
   * los filtros de Caducidades.
   */
  getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsRecord>;

  /**
   * Busca artículos activos disponibles para registrar
   * una pérdida por caducidad.
   */
  searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchRecord[]>;

  /**
   * Registra atómicamente una nueva pérdida por caducidad.
   */
  createCaducidad(command: CaducidadCreateRecord): Promise<void>;

  /**
   * Revierte atómicamente una pérdida por caducidad.
   */
  deactivateCaducidad(idCaducidad: number): Promise<void>;
}
