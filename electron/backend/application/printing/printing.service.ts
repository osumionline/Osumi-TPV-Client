import type HtmlDocumentRenderer from '@backend/contracts/printing/html-document-renderer.interface';
import type PrinterProvider from '@backend/contracts/printing/printer.provider.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';
import type { Buffer } from 'node:buffer';

const MAX_DOCUMENT_HTML_LENGTH: number = 2_000_000;

export default class PrintingService {
  constructor(
    private readonly settingsRepository: PrintingSettingsRepository,
    private readonly printerProvider: PrinterProvider,
    private readonly documentRenderer: HtmlDocumentRenderer,
  ) {}

  getPrinters(): Promise<readonly PrinterInterface[]> {
    return this.printerProvider.getPrinters();
  }

  getSettings(): Promise<PrintingSettings> {
    return this.settingsRepository.load();
  }

  async setTicketPrinterDeviceName(value: unknown): Promise<PrintingSettings> {
    const deviceName: string | null = this.normalizeDeviceName(value);

    if (deviceName !== null) {
      const printers: readonly PrinterInterface[] = await this.printerProvider.getPrinters();

      const printerExists: boolean = printers.some(
        (printer: PrinterInterface): boolean => printer.deviceName === deviceName,
      );

      if (!printerExists) {
        throw new Error('La impresora seleccionada no está disponible en este equipo.');
      }
    }

    const currentSettings: PrintingSettings = await this.settingsRepository.load();

    const nextSettings: PrintingSettings = {
      ...currentSettings,
      ticketPrinterDeviceName: deviceName,
    };

    await this.settingsRepository.save(nextSettings);

    return nextSettings;
  }

  /**
   * Genera un PDF a partir de un documento HTML utilizando
   * el renderer Chromium oculto del proceso principal.
   */
  async renderPdf(value: unknown): Promise<Uint8Array> {
    const documentHtml: string = this.normalizeDocumentHtml(value);

    const pdfBuffer: Buffer = await this.documentRenderer.renderPdf(documentHtml);

    /*
     * IPC transporta explícitamente un Uint8Array.
     *
     * No exponemos Buffer como parte de los contratos
     * públicos porque Buffer pertenece al runtime Node.
     */
    return new Uint8Array(pdfBuffer);
  }

  private normalizeDocumentHtml(value: unknown): string {
    if (typeof value !== 'string') {
      throw new TypeError('El documento HTML no es válido.');
    }

    if (value.trim().length === 0) {
      throw new Error('El documento HTML está vacío.');
    }

    if (value.length > MAX_DOCUMENT_HTML_LENGTH) {
      throw new RangeError('El documento HTML supera el tamaño máximo permitido.');
    }

    return value;
  }

  private normalizeDeviceName(value: unknown): string | null {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new TypeError('El identificador de la impresora no es válido.');
    }

    const normalizedValue: string = value.trim();

    return normalizedValue.length === 0 ? null : normalizedValue;
  }
}
