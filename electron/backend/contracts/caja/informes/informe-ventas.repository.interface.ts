import type { InformeVentasRepositoryResult } from '@backend/domain/caja/informes/informe-ventas-record.interface';

export default interface InformeVentasRepository {
  /**
   * Recupera el catálogo actual de categorías,
   * sus relaciones con artículos y las líneas
   * válidas del periodo indicado.
   */
  findByPeriod(desde: string, hastaExclusive: string): Promise<InformeVentasRepositoryResult>;
}
