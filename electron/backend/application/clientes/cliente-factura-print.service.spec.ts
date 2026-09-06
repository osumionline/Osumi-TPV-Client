import ClienteFacturaPrintService from '@backend/application/clientes/cliente-factura-print.service';
import type PdfPrintDialog from '@backend/contracts/printing/pdf-print-dialog.interface';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteFacturaPdfProvider {
  readonly pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nfactura');
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;
  error: Error | null = null;

  /**
   * Devuelve los bytes configurados para la prueba.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array> {
    this.receivedConsulta = consulta;

    return this.error === null ? Promise.resolve(this.pdf) : Promise.reject(this.error);
  }
}

class FakePdfPrintDialog implements PdfPrintDialog {
  receivedPdf: Uint8Array | null = null;

  /**
   * Registra los bytes enviados a impresión.
   */
  open(pdf: Uint8Array): Promise<void> {
    this.receivedPdf = pdf;

    return Promise.resolve();
  }
}

describe('ClienteFacturaPrintService', (): void => {
  it('envía al diálogo exactamente los bytes canónicos almacenados', async (): Promise<void> => {
    const pdfProvider = new FakeClienteFacturaPdfProvider();
    const printDialog = new FakePdfPrintDialog();
    const service = new ClienteFacturaPrintService(pdfProvider, printDialog);
    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    };

    await service.print(consulta);

    expect(pdfProvider.receivedConsulta).toBe(consulta);

    expect(printDialog.receivedPdf).toBe(pdfProvider.pdf);
  });

  it('no abre el diálogo cuando no puede obtener el PDF definitivo', async (): Promise<void> => {
    const pdfProvider = new FakeClienteFacturaPdfProvider();
    const printDialog = new FakePdfPrintDialog();

    pdfProvider.error = new Error('PDF no disponible');

    const service = new ClienteFacturaPrintService(pdfProvider, printDialog);

    await expect(
      service.print({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toThrow('PDF no disponible');

    expect(printDialog.receivedPdf).toBeNull();
  });
});
