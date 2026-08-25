import { Service } from '@angular/core';
import type {
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';

@Service()
export default class VentasHistoricoService {
  /**
   * Recupera las ventas y agregados correspondientes
   * al periodo civil local indicado.
   */
  async getHistorico(consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado> {
    return window.osumiDesktop.ventas.getHistorico(consulta);
  }

  /**
   * Recupera bajo demanda el detalle histórico
   * de una venta concreta.
   */
  async getDetalle(idVenta: number): Promise<VentaHistoricoDetalle | null> {
    return window.osumiDesktop.ventas.getHistoricoDetalle(idVenta);
  }
}
