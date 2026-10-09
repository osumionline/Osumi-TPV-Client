import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type PdfPrintDialog from '@backend/contracts/printing/pdf-print-dialog.interface';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';

interface ClienteFacturaPdfProvider {
  /**
   * Obtiene los bytes canónicos de una factura.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array>;
}

export default class ClienteFacturaPrintService {
  /**
   * Crea el servicio encargado de abrir
   * la impresión del PDF definitivo de una factura.
   */
  constructor(
    private readonly pdfProvider: ClienteFacturaPdfProvider,
    private readonly printDialog: PdfPrintDialog,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Imprime únicamente el PDF definitivo e inmutable
   * asociado a la factura solicitada.
   *
   * Los fallos al obtener o generar el PDF se registran
   * en ClienteFacturaPdfService. Aquí solo se registra
   * una incidencia propia del diálogo de impresión.
   */
  async print(consulta: ClienteFacturaDocumentoConsulta): Promise<void> {
    const pdf: Uint8Array = await this.pdfProvider.getOrCreatePdf(consulta);

    try {
      await this.printDialog.open(pdf);
    } catch (error: unknown) {
      this.applicationLogger.warn({
        area: 'clientes',
        operation: 'print-invoice',
        message: 'No se ha podido imprimir una factura.',
        error,
        context: {
          facturaPublicId: consulta.facturaPublicId,
        },
      });

      throw error;
    }
  }
}
