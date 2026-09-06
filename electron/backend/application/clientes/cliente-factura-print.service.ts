import type PdfPrintDialog from '@backend/contracts/printing/pdf-print-dialog.interface';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';

interface ClienteFacturaPdfProvider {
  /**
   * Obtiene los bytes canónicos de una factura.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array>;
}

export default class ClienteFacturaPrintService {
  constructor(
    private readonly pdfProvider: ClienteFacturaPdfProvider,
    private readonly printDialog: PdfPrintDialog,
  ) {}

  /**
   * Imprime únicamente el PDF definitivo e inmutable
   * asociado a la factura solicitada.
   */
  async print(consulta: ClienteFacturaDocumentoConsulta): Promise<void> {
    const pdf: Uint8Array = await this.pdfProvider.getOrCreatePdf(consulta);

    await this.printDialog.open(pdf);
  }
}
