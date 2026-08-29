import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type {
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';

export default interface VentasApi {
  getContext(): Promise<VentasContextInterface>;

  resolveArticulo(codigo: string): Promise<ArticuloVentaInterface | null>;

  searchArticulos(query: string): Promise<readonly ArticuloVentaInterface[]>;

  getAccesosDirectos(): Promise<readonly AccesoDirectoVentaInterface[]>;

  getDevolucion(idVenta: number): Promise<VentaDevolucionInterface | null>;

  getHistorico(consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado>;

  getHistoricoDetalle(idVenta: number): Promise<VentaHistoricoDetalle | null>;

  /**
   * Cambia el cliente de una venta histórica.
   */
  cambiarCliente(command: VentaPostventaCambiarClienteCommand): Promise<VentaHistoricoDetalle>;

  /**
   * Cambia el único tipo de pago de una venta histórica.
   */
  cambiarTipoPago(command: VentaPostventaCambiarTipoPagoCommand): Promise<VentaHistoricoDetalle>;

  getTicket(idVenta: number): Promise<VentaTicketInterface | null>;

  /**
   * Recupera el PDF únicamente cuando coincide con
   * la revisión documental vigente.
   */
  getTicketPdf(idVenta: number): Promise<Uint8Array | null>;

  /**
   * Materializa el PDF correspondiente a una revisión
   * documental concreta de una venta.
   */
  saveTicketPdf(idVenta: number, ticketRevision: number, pdf: Uint8Array): Promise<void>;

  /**
   * Envía por email el PDF vigente de una venta.
   */
  sendTicketEmail(command: VentaTicketEmailCommand): Promise<void>;

  /**
   * Ejecuta el procesamiento TicketBAI inicial
   * de una venta ya persistida.
   */
  processTicketBai(idVenta: number): Promise<void>;

  /**
   * Consulta y reconcilia el estado remoto
   * TicketBAI de una venta ya enviada.
   */
  reconcileTicketBai(idVenta: number): Promise<void>;

  save(command: GuardarVentaCommand): Promise<GuardarVentaResult>;
}
