import { Service } from '@angular/core';

@Service()
export default class VentaTicketBaiService {
  /**
   * Solicita al backend el procesamiento
   * TicketBAI inicial de una venta confirmada.
   */
  processInitial(idVenta: number): Promise<void> {
    return window.osumiDesktop.ventas.processTicketBai(idVenta);
  }

  /**
   * Solicita al backend la reconciliación
   * remota de una venta TicketBAI.
   */
  reconcile(idVenta: number): Promise<void> {
    return window.osumiDesktop.ventas.reconcileTicketBai(idVenta);
  }
}
