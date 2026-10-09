import ClienteFacturaPrintService from '@backend/application/clientes/cliente-factura-print.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type PdfPrintDialog from '@backend/contracts/printing/pdf-print-dialog.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
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
  error: Error | null = null;

  /**
   * Registra los bytes enviados a impresión
   * y permite simular un fallo del diálogo.
   */
  open(pdf: Uint8Array): Promise<void> {
    this.receivedPdf = pdf;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve();
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de impresión de facturas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos emitidos durante las pruebas.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No existen escrituras pendientes
   * en este logger de memoria.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ClienteFacturaPrintService', (): void => {
  it('envía al diálogo exactamente los bytes canónicos almacenados sin generar avisos', async (): Promise<void> => {
    const pdfProvider = new FakeClienteFacturaPdfProvider();
    const printDialog = new FakePdfPrintDialog();
    const applicationLogger = new TestApplicationLogger();

    const service = new ClienteFacturaPrintService(pdfProvider, printDialog, applicationLogger);

    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    };

    await service.print(consulta);

    expect(pdfProvider.receivedConsulta).toBe(consulta);
    expect(printDialog.receivedPdf).toBe(pdfProvider.pdf);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('no duplica el logging cuando falla la obtención del PDF definitivo', async (): Promise<void> => {
    const pdfProvider = new FakeClienteFacturaPdfProvider();
    const printDialog = new FakePdfPrintDialog();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('PDF no disponible');

    pdfProvider.error = error;

    const service = new ClienteFacturaPrintService(pdfProvider, printDialog, applicationLogger);

    await expect(
      service.print({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toBe(error);

    expect(printDialog.receivedPdf).toBeNull();
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo propio del diálogo de impresión', async (): Promise<void> => {
    const pdfProvider = new FakeClienteFacturaPdfProvider();
    const printDialog = new FakePdfPrintDialog();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('La ventana principal no está disponible.');

    printDialog.error = error;

    const service = new ClienteFacturaPrintService(pdfProvider, printDialog, applicationLogger);

    await expect(
      service.print({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toBe(error);

    expect(printDialog.receivedPdf).toBe(pdfProvider.pdf);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'print-invoice',
        message: 'No se ha podido imprimir una factura.',
        error,
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });
});
