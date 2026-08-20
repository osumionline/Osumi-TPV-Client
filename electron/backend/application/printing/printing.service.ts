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
   * Genera un PDF utilizando el renderer Chromium
   * oculto del proceso principal.
   */
  async renderPdf(value: unknown): Promise<Uint8Array> {
    const documentHtml: string = this.normalizeDocumentHtml(value);

    const pdfBuffer: Buffer = await this.documentRenderer.renderPdf(documentHtml);

    return new Uint8Array(pdfBuffer);
  }

  /**
   * Imprime el documento en la impresora de tickets
   * configurada para este equipo.
   */
  async printTicket(value: unknown): Promise<void> {
    const documentHtml: string = this.normalizeDocumentHtml(value);

    const settings: PrintingSettings = await this.settingsRepository.load();

    const deviceName: string | null = settings.ticketPrinterDeviceName;

    if (deviceName === null) {
      throw new Error('No hay una impresora de tickets configurada.');
    }

    /*
     * Comprobamos antes que la impresora siga
     * existiendo en este equipo.
     *
     * No modificamos la configuración si ha
     * desaparecido: puede ser una desconexión
     * temporal.
     */
    const printers: readonly PrinterInterface[] = await this.printerProvider.getPrinters();

    const printerExists: boolean = printers.some(
      (printer: PrinterInterface): boolean => printer.deviceName === deviceName,
    );

    if (!printerExists) {
      throw new Error('La impresora de tickets configurada no está disponible en este equipo.');
    }

    await this.documentRenderer.print(documentHtml, deviceName);
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
