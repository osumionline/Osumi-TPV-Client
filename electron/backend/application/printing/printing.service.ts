import type PrinterProvider from '@backend/contracts/printing/printer.provider.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';

export default class PrintingService {
  constructor(
    private readonly settingsRepository: PrintingSettingsRepository,
    private readonly printerProvider: PrinterProvider,
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
