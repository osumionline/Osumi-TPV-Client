import PrintingService from '@backend/application/printing/printing.service';
import type HtmlDocumentRenderer from '@backend/contracts/printing/html-document-renderer.interface';
import type PrinterProvider from '@backend/contracts/printing/printer.provider.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';
import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';

describe('PrintingService', (): void => {
  it('genera un PDF mediante el renderer y devuelve un Uint8Array', async (): Promise<void> => {
    const settingsRepository: FakePrintingSettingsRepository = new FakePrintingSettingsRepository(
      null,
    );

    const printerProvider: FakePrinterProvider = new FakePrinterProvider([]);

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    const service: PrintingService = new PrintingService(
      settingsRepository,
      printerProvider,
      renderer,
    );

    const documentHtml: string = '<!doctype html><html><body>Ticket</body></html>';

    const pdf: Uint8Array = await service.renderPdf(documentHtml);

    expect(renderer.renderPdfCalls).toEqual([documentHtml]);

    expect(pdf).toBeInstanceOf(Uint8Array);

    expect(Buffer.from(pdf).toString('utf8')).toBe(renderer.pdfResult.toString('utf8'));
  });

  it('propaga un error del renderer al generar el PDF', async (): Promise<void> => {
    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    renderer.renderPdfError = new Error('Fallo al generar el PDF.');

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository(null),
      new FakePrinterProvider([]),
      renderer,
    );

    await expect(service.renderPdf('<html><body>Ticket</body></html>')).rejects.toThrow(
      'Fallo al generar el PDF.',
    );
  });

  it('rechaza la impresión si no hay impresora configurada', async (): Promise<void> => {
    const printerProvider: FakePrinterProvider = new FakePrinterProvider([]);

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository(null),
      printerProvider,
      renderer,
    );

    await expect(service.printTicket('<html><body>Ticket</body></html>')).rejects.toThrow(
      'No hay una impresora de tickets configurada.',
    );

    expect(printerProvider.getPrintersCalls).toBe(0);
    expect(renderer.printCalls).toEqual([]);
  });

  it('rechaza la impresión si la impresora configurada ya no está disponible', async (): Promise<void> => {
    const printerProvider: FakePrinterProvider = new FakePrinterProvider([]);

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository('printer-1'),
      printerProvider,
      renderer,
    );

    await expect(service.printTicket('<html><body>Ticket</body></html>')).rejects.toThrow(
      'La impresora de tickets configurada no está disponible en este equipo.',
    );

    expect(printerProvider.getPrintersCalls).toBe(1);
    expect(renderer.printCalls).toEqual([]);
  });

  it('envía el documento a la impresora configurada', async (): Promise<void> => {
    const printer: PrinterInterface = {
      deviceName: 'printer-1',
      displayName: 'Star TSP100',
      description: 'Impresora térmica',
    };

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository('printer-1'),
      new FakePrinterProvider([printer]),
      renderer,
    );

    const documentHtml: string = '<html><body>Ticket definitivo</body></html>';

    await service.printTicket(documentHtml);

    expect(renderer.printCalls).toEqual([
      {
        documentHtml,
        deviceName: 'printer-1',
      },
    ]);
  });

  it('propaga un fallo del trabajo de impresión', async (): Promise<void> => {
    const printer: PrinterInterface = {
      deviceName: 'printer-1',
      displayName: 'Star TSP100',
      description: 'Impresora térmica',
    };

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    renderer.printError = new Error('El trabajo de impresión ha fallado.');

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository('printer-1'),
      new FakePrinterProvider([printer]),
      renderer,
    );

    await expect(
      service.printTicket('<html><body>Ticket definitivo</body></html>'),
    ).rejects.toThrow('El trabajo de impresión ha fallado.');
  });

  it('envía exactamente el PDF a la impresora configurada', async (): Promise<void> => {
    const printer: PrinterInterface = {
      deviceName: 'printer-1',
      displayName: 'Star TSP100',
      description: 'Impresora térmica',
    };

    const renderer: FakeHtmlDocumentRenderer = new FakeHtmlDocumentRenderer();

    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository('printer-1'),
      new FakePrinterProvider([printer]),
      renderer,
    );

    const pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');

    await service.printPdf(pdf);

    expect(renderer.printPdfCalls).toEqual([
      {
        pdf,
        deviceName: 'printer-1',
      },
    ]);
  });

  it('rechaza contenido que no sea un PDF al reimprimir', async (): Promise<void> => {
    const service: PrintingService = new PrintingService(
      new FakePrintingSettingsRepository('printer-1'),
      new FakePrinterProvider([]),
      new FakeHtmlDocumentRenderer(),
    );

    await expect(service.printPdf(new TextEncoder().encode('no-pdf'))).rejects.toThrow(
      'El documento recibido no contiene un PDF válido.',
    );
  });
});

class FakePrintingSettingsRepository implements PrintingSettingsRepository {
  private settings: PrintingSettings;

  savedSettings: PrintingSettings | null = null;

  constructor(ticketPrinterDeviceName: string | null) {
    this.settings = {
      schemaVersion: 1,
      ticketPrinterDeviceName,
    };
  }

  load(): Promise<PrintingSettings> {
    return Promise.resolve(this.settings);
  }

  save(settings: PrintingSettings): Promise<void> {
    this.settings = settings;
    this.savedSettings = settings;

    return Promise.resolve();
  }
}

class FakePrinterProvider implements PrinterProvider {
  getPrintersCalls: number = 0;

  constructor(private readonly printers: readonly PrinterInterface[]) {}

  getPrinters(): Promise<readonly PrinterInterface[]> {
    this.getPrintersCalls++;

    return Promise.resolve(this.printers);
  }
}

interface PrintCall {
  readonly documentHtml: string;
  readonly deviceName: string;
}

class FakeHtmlDocumentRenderer implements HtmlDocumentRenderer {
  readonly renderPdfCalls: string[] = [];
  readonly printCalls: PrintCall[] = [];

  readonly pdfResult: Buffer = Buffer.from('%PDF-1.7\nticket\n%%EOF', 'utf8');

  renderPdfError: Error | null = null;
  printError: Error | null = null;

  readonly printPdfCalls: {
    readonly pdf: Uint8Array;
    readonly deviceName: string;
  }[] = [];

  printPdfError: Error | null = null;

  renderPdf(documentHtml: string): Promise<Buffer> {
    this.renderPdfCalls.push(documentHtml);

    if (this.renderPdfError !== null) {
      return Promise.reject(this.renderPdfError);
    }

    return Promise.resolve(this.pdfResult);
  }

  print(documentHtml: string, deviceName: string): Promise<void> {
    this.printCalls.push({
      documentHtml,
      deviceName,
    });

    if (this.printError !== null) {
      return Promise.reject(this.printError);
    }

    return Promise.resolve();
  }

  /**
   * Registra una impresión PDF simulada.
   */
  printPdf(pdf: Uint8Array, deviceName: string): Promise<void> {
    this.printPdfCalls.push({
      pdf,
      deviceName,
    });

    if (this.printPdfError !== null) {
      return Promise.reject(this.printPdfError);
    }

    return Promise.resolve();
  }
}
