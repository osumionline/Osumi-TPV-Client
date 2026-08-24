import type {
  VentaHistoricoDetalleRecord,
  VentasHistoricoResultadoRecord,
} from '@backend/domain/ventas/venta-historico-record.interface';

export default interface VentasHistoricoRepository {
  /**
   * Recupera las ventas y los agregados de un intervalo temporal absoluto.
   *
   * El límite inicial es inclusivo y el final exclusivo.
   */
  findByPeriod(desde: string, hastaExclusive: string): Promise<VentasHistoricoResultadoRecord>;

  /**
   * Recupera el detalle histórico necesario para una venta concreta.
   */
  findDetalleByVentaId(idVenta: number): Promise<VentaHistoricoDetalleRecord | null>;
}
