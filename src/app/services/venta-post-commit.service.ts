import { inject, Service } from '@angular/core';

import ClientesService from '@services/clientes.service';
import ReservasService from '@services/reservas.service';
import VentaTicketDocumentService from '@services/venta-ticket-document.service';
import { getErrorMessage } from '@utils/error.utils';

@Service()
export default class VentaPostCommitService {
  private readonly clientesService: ClientesService = inject(ClientesService);

  private readonly reservasService: ReservasService = inject(ReservasService);

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
  ): Promise<readonly string[]> {
    const warnings: string[] = [];

    if (clientePublicId !== null) {
      await this.invalidateClienteEstadisticas(clientePublicId, warnings);
    }

    if (reloadReservas) {
      await this.reloadReservas(warnings);
    }

    await this.generateAndSavePdf(idVenta, warnings);

    if (imprimirTicket) {
      await this.printTicket(idVenta, warnings);
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
}
