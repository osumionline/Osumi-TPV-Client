import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type {
  VentaTicketLineaRecord,
  VentaTicketPagoRecord,
  VentaTicketRecord,
} from '@backend/domain/ventas/venta-ticket-record.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
  VentaTicketPagoInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';

export default class VentasTicketsService {
  constructor(
    private readonly ventasTicketsRepository: VentasTicketsRepository,
    private readonly ventaTicketPdfStorage: VentaTicketPdfStorage,
  ) {}

  /**
   * Recupera el snapshot documental vigente de una venta.
   */
  async getByVentaId(idVenta: number): Promise<VentaTicketInterface | null> {
    this.validateVentaId(idVenta);

    const venta: VentaTicketRecord | null =
      await this.ventasTicketsRepository.findByVentaId(idVenta);

    if (venta === null) {
      return null;
    }

    return {
      id: venta.id,
      publicId: venta.publicId,
      serie: venta.serie,
      numero: venta.numero,
      fecha: venta.fecha,
      empleadoNombre: venta.empleadoNombre,
      clienteNombre: venta.clienteNombre,
      ticketBai:
        venta.ticketBai === null
          ? null
          : {
              serie: venta.ticketBai.serie,
              numero: venta.ticketBai.numero,
              identificativo: venta.ticketBai.identificativo,
              qr: venta.ticketBai.qr,
              url: venta.ticketBai.url,
            },
      totalCents: venta.totalCents,
      ticketRevision: venta.ticketRevision,
      ticketPdfRevision: venta.ticketPdfRevision,
      pagos: venta.pagos.map((pago: VentaTicketPagoRecord): VentaTicketPagoInterface => ({
        nombre: pago.nombre,
        importeCents: pago.importeCents,
        entregadoCents: pago.entregadoCents,
        cambioCents: pago.cambioCents,
      })),
      lineas: venta.lineas.map((linea: VentaTicketLineaRecord): VentaTicketLineaInterface => ({
        nombre: linea.nombre,
        pvpMicros: linea.pvpMicros,
        ivaBps: linea.ivaBps,
        importeMicros: linea.importeMicros,
        descuentoBps: linea.descuentoBps,
        importeDescuentoMicros: linea.importeDescuentoMicros,
        unidades: linea.unidades,
        regalo: linea.regalo,
      })),
    };
  }

  /**
   * Recupera el PDF únicamente cuando representa todavía
   * la revisión documental vigente de la venta.
   *
   * La revisión se comprueba antes y después de leer el
   * filesystem para evitar devolver bytes obsoletos si
   * cambia la venta durante la lectura.
   */
  async getCurrentPdf(idVenta: number): Promise<Uint8Array | null> {
    this.validateVentaId(idVenta);

    const ventaAntes: VentaTicketRecord | null =
      await this.ventasTicketsRepository.findByVentaId(idVenta);

    if (ventaAntes === null) {
      return null;
    }

    const currentRevision: number = ventaAntes.ticketRevision;

    if (ventaAntes.ticketPdfRevision !== currentRevision) {
      return null;
    }

    const pdf: Uint8Array | null = await this.ventaTicketPdfStorage.read(idVenta);

    if (pdf === null) {
      return null;
    }

    const ventaDespues: VentaTicketRecord | null =
      await this.ventasTicketsRepository.findByVentaId(idVenta);

    if (
      ventaDespues === null ||
      ventaDespues.ticketRevision !== currentRevision ||
      ventaDespues.ticketPdfRevision !== currentRevision
    ) {
      return null;
    }

    return pdf;
  }

  /**
   * Materializa exactamente la revisión documental indicada.
   *
   * Una revisión que haya quedado obsoleta durante el render
   * nunca puede marcarse como PDF vigente.
   */
  async savePdf(idVenta: number, expectedRevision: number, pdf: Uint8Array): Promise<void> {
    this.validateVentaId(idVenta);
    this.validateTicketRevision(expectedRevision);

    const venta: VentaTicketRecord | null =
      await this.ventasTicketsRepository.findByVentaId(idVenta);

    if (venta === null) {
      throw new Error('No se ha encontrado la venta asociada al PDF del ticket.');
    }

    if (venta.ticketRevision !== expectedRevision) {
      throw new Error('El ticket ha cambiado mientras se generaba el PDF.');
    }

    if (
      venta.ticketPdfRevision === expectedRevision &&
      (await this.ventaTicketPdfStorage.exists(idVenta))
    ) {
      return;
    }

    await this.ventaTicketPdfStorage.save(idVenta, pdf);

    const marked: boolean = await this.ventasTicketsRepository.markPdfRevision(
      idVenta,
      expectedRevision,
    );

    if (!marked) {
      throw new Error('El ticket ha cambiado mientras se guardaba el PDF.');
    }
  }

  /**
   * Valida el identificador interno de una venta.
   */
  private validateVentaId(idVenta: number): void {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }
  }

  /**
   * Valida una revisión documental esperada.
   */
  private validateTicketRevision(revision: number): void {
    if (!Number.isSafeInteger(revision) || revision <= 0) {
      throw new RangeError('La revisión del ticket no es válida.');
    }
  }
}
