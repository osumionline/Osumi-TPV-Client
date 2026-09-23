import type { InformeSimpleRepositoryResult } from '@backend/domain/caja/informes/informe-simple-record.interface';

export default interface InformeSimpleRepository {
  /**
   * Recupera las ventas, pagos y tipos de pago necesarios
   * para construir el Informe Simple de un intervalo absoluto.
   *
   * El límite inicial es inclusivo y el final exclusivo.
   */
  findByPeriod(desde: string, hastaExclusive: string): Promise<InformeSimpleRepositoryResult>;
}
