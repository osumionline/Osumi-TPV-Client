import { inject, Service } from '@angular/core';
import ApplicationLoggingService from '@services/application/application-logging.service';
import ClientesService from '@services/clientes/clientes.service';
import ReservasService from '@services/ventas/reservas.service';
import VentaTicketBaiService from '@services/ventas/venta-ticket-bai.service';
import VentaTicketDocumentService from '@services/ventas/venta-ticket-document.service';
import { getErrorMessage } from '@utils/error.utils';

@Service()
export default class VentaPostCommitService {
  private readonly clientesService: ClientesService = inject(ClientesService);
  private readonly reservasService: ReservasService = inject(ReservasService);
  private readonly ventaTicketBaiService: VentaTicketBaiService = inject(VentaTicketBaiService);
  private readonly ventaTicketDocumentService: VentaTicketDocumentService = inject(
    VentaTicketDocumentService,
  );
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);

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
      await this.invalidateClienteEstadisticas(idVenta, clientePublicId, warnings);
    }

    if (reloadReservas) {
      await this.reloadReservas(idVenta, warnings);
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

  /**
   * Invalida las estadísticas cacheadas del cliente
   * después de haber confirmado definitivamente la venta.
   */
  private async invalidateClienteEstadisticas(
    idVenta: number,
    clientePublicId: string,
    warnings: string[],
  ): Promise<void> {
    try {
      await this.clientesService.invalidateEstadisticas(clientePublicId);
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-client-statistics',
        message:
          'No se han podido actualizar las estadísticas del cliente después de confirmar la venta.',
        error,
        context: {
          idVenta,
        },
      });

      warnings.push(
        `No se han podido actualizar las estadísticas del cliente. ${getErrorMessage(
          error,
          'Se ha producido un error inesperado.',
        )}`,
      );
    }
  }

  /**
   * Actualiza la colección de reservas después
   * de una venta que las haya consumido.
   *
   * Los errores normales de carga son registrados
   * por ReservasService en su punto de origen.
   */
  private async reloadReservas(idVenta: number, warnings: string[]): Promise<void> {
    try {
      await this.reservasService.reload();

      const reservasError: string | null = this.reservasService.error();

      if (reservasError !== null) {
        warnings.push(`No se ha podido actualizar la lista de reservas. ${reservasError}`);
      }
    } catch (error: unknown) {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-reservations-reload',
        message: 'La venta se ha confirmado, pero ha fallado la recarga de reservas.',
        error,
        context: {
          idVenta,
        },
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-ticketbai',
        message: 'No se ha podido completar TicketBAI después de confirmar la venta.',
        error,
        context: {
          idVenta,
        },
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-ticket-pdf',
        message: 'No se ha podido conservar el PDF histórico del ticket.',
        error,
        context: {
          idVenta,
        },
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-ticket-print',
        message: 'No se ha podido imprimir el ticket después de confirmar la venta.',
        error,
        context: {
          idVenta,
        },
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-invoice-create',
        message:
          'Se ha solicitado crear una factura después de confirmar una venta sin cliente persistido.',
      });

      warnings.push(
        'No se ha podido crear la factura porque la venta no tiene un cliente persistido asociado.',
      );

      return;
    }

    if (ventaPublicId === null || ventaPublicId.trim() === '') {
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-invoice-create',
        message:
          'Se ha solicitado crear una factura después de confirmar una venta sin identificador persistido válido.',
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-invoice-create',
        message: 'No se ha podido crear la factura después de confirmar la venta.',
        error,
        context: {
          ventaPublicId,
        },
      });

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
      this.loggingService.warn({
        area: 'ventas',
        operation: 'post-commit-invoice-print',
        message:
          'La factura se ha creado correctamente, pero no se ha podido abrir su diálogo de impresión.',
        error,
        context: {
          ventaPublicId,
          facturaPublicId,
        },
      });

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
