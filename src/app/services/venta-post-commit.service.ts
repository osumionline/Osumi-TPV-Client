import { inject, Service } from '@angular/core';
import ClientesService from '@services/clientes.service';
import ReservasService from '@services/reservas.service';
import VentaTicketBaiService from '@services/venta-ticket-bai.service';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';
import { getErrorMessage } from '@utils/error.utils';

@Service()
export default class VentaPostCommitService {
  private readonly clientesService: ClientesService = inject(ClientesService);
  private readonly reservasService: ReservasService = inject(ReservasService);
  private readonly ventaTicketBaiService: VentaTicketBaiService = inject(VentaTicketBaiService);
  private readonly ventaTicketDocumentService: VentaTicketDocumentService = inject(
    VentaTicketDocumentService,
  );

  /**
   * Ejecuta los trabajos posteriores al COMMIT de una venta.
   *
   * Ninguna incidencia se propaga porque a estas alturas
   * la operación comercial ya está definitivamente guardada.
   */
  async run(
    idVenta: number,
    reloadReservas: boolean,
    clientePublicId: string | null,
    imprimirTicket: boolean,
    ventaPublicId: string | null = null,
    imprimirFactura: boolean = false,
  ): Promise<readonly string[]> {
    const warnings: string[] = [];

    if (clientePublicId !== null) {
      await this.invalidateClienteEstadisticas(clientePublicId, warnings);
    }

    if (reloadReservas) {
      await this.reloadReservas(warnings);
    }

    await this.processTicketBai(idVenta, warnings);
    await this.generateAndSavePdf(idVenta, warnings);

    if (imprimirTicket) {
      await this.printTicket(idVenta, warnings);
    }

    if (imprimirFactura) {
      await this.createAndPrintFactura(ventaPublicId, clientePublicId, warnings);
    }

    return warnings;
  }

  private async invalidateClienteEstadisticas(
    clientePublicId: string,
    warnings: string[],
  ): Promise<void> {
    try {
      await this.clientesService.invalidateEstadisticas(clientePublicId);
    } catch (error: unknown) {
      warnings.push(
        `No se han podido actualizar las estadísticas del cliente. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  private async reloadReservas(warnings: string[]): Promise<void> {
    try {
      await this.reservasService.reload();

      const reservasError: string | null = this.reservasService.error();

      if (reservasError !== null) {
        warnings.push(`No se ha podido actualizar la lista de reservas. ${reservasError}`);
      }
    } catch (error: unknown) {
      warnings.push(
        `No se ha podido actualizar la lista de reservas. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  /**
   * Procesa TicketBAI sin impedir que el ticket
   * comercial se genere e imprima ante una incidencia.
   */
  private async processTicketBai(idVenta: number, warnings: string[]): Promise<void> {
    try {
      await this.ventaTicketBaiService.processInitial(idVenta);
    } catch (error: unknown) {
      warnings.push(
        `No se ha podido completar TicketBAI. El ticket se imprimirá sin el código QR fiscal. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  private async generateAndSavePdf(idVenta: number, warnings: string[]): Promise<void> {
    try {
      await this.ventaTicketDocumentService.generateAndSavePdf(idVenta);
    } catch (error: unknown) {
      warnings.push(
        `No se ha podido conservar el PDF histórico del ticket. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  private async printTicket(idVenta: number, warnings: string[]): Promise<void> {
    try {
      await this.ventaTicketDocumentService.print(idVenta);
    } catch (error: unknown) {
      warnings.push(
        `No se ha podido imprimir el ticket. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  /**
   * Crea una factura emitida para la venta confirmada
   * y abre después su diálogo estándar de impresión.
   *
   * Ambas operaciones son posteriores al COMMIT de la
   * venta y sus incidencias se convierten en avisos.
   */
  private async createAndPrintFactura(
    ventaPublicId: string | null,
    clientePublicId: string | null,
    warnings: string[],
  ): Promise<void> {
    if (clientePublicId === null || clientePublicId.trim() === '') {
      warnings.push(
        'No se ha podido crear la factura porque la venta no tiene un cliente persistido asociado.',
      );

      return;
    }

    if (ventaPublicId === null || ventaPublicId.trim() === '') {
      warnings.push(
        'No se ha podido crear la factura porque la venta guardada no contiene un identificador válido.',
      );

      return;
    }

    let facturaPublicId: string;
    let numeroFactura: string | null;

    try {
      const factura = await this.clientesService.createFacturaDesdeVenta({
        clientePublicId,
        ventaPublicId,
      });

      facturaPublicId = factura.publicId;
      numeroFactura = factura.numeroFactura;
    } catch (error: unknown) {
      warnings.push(
        `No se ha podido crear la factura de la venta. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );

      return;
    }

    try {
      await this.clientesService.printFactura({
        clientePublicId,
        facturaPublicId,
      });
    } catch (error: unknown) {
      const referencia: string =
        numeroFactura === null ? 'La factura' : `La factura ${numeroFactura}`;

      warnings.push(
        `${referencia} se ha creado correctamente, pero no se ha podido abrir el diálogo de impresión. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }
}
