import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidades/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidades/caducidad-query.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidades/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadResultadoRecord,
} from '@backend/domain/almacen/caducidades/caducidad-record.interface';
import type { CaducidadReportRecord } from '@backend/domain/almacen/caducidades/caducidad-report-record.interface';

/**
 * Define el acceso a los datos operativos de Caducidades.
 */
export default interface CaducidadesRepository {
  /**
   * Recupera una página de Caducidades y los totales
   * correspondientes al conjunto filtrado completo.
   */
  searchCaducidades(query: CaducidadRepositoryQuery): Promise<CaducidadResultadoRecord>;

  /**
   * Recupera el informe histórico agregado
   * del conjunto filtrado de Caducidades.
   */
  getCaducidadReport(query: CaducidadFilterQuery): Promise<CaducidadReportRecord>;

  /**
   * Recupera las opciones históricas realmente disponibles
   * para los filtros de Caducidades.
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
