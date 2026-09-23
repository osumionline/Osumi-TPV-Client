import type { InformeDetalladoRepositoryResult } from '@backend/domain/caja/informes/informe-detallado-record.interface';

export default interface InformeDetalladoRepository {
  /**
   * Recupera todas las magnitudes necesarias para construir
   * el Informe Detallado y compararlo con su periodo anterior.
   */
  find(
    actualDesde: string,
    actualHastaExclusive: string,
    anteriorDesde: string,
    anteriorHastaExclusive: string,
  ): Promise<InformeDetalladoRepositoryResult>;
}
