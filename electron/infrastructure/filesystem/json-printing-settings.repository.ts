import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type PrintingSettings from '@desktop-contracts/configuration/printing/printing-settings.interface';
import writeAtomicTextFile from '@infrastructure/filesystem/write-atomic-text-file';
import { readFile } from 'node:fs/promises';

const DEFAULT_PRINTING_SETTINGS: PrintingSettings = {
  schemaVersion: 1,
  ticketPrinterDeviceName: null,
};

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isPrintingSettings(value: unknown): value is PrintingSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const settings: Record<string, unknown> = value as Record<string, unknown>;

  return (
    settings['schemaVersion'] === 1 &&
    (settings['ticketPrinterDeviceName'] === null ||
      typeof settings['ticketPrinterDeviceName'] === 'string')
  );
}

export default class JsonPrintingSettingsRepository implements PrintingSettingsRepository {
  constructor(private readonly filePath: string) {}

  async load(): Promise<PrintingSettings> {
    try {
      const content: string = await readFile(this.filePath, {
        encoding: 'utf8',
      });

      const parsed: unknown = JSON.parse(content);

      if (!isPrintingSettings(parsed)) {
        throw new Error('El archivo printing_settings.json no tiene una estructura válida.');
      }

      return parsed;
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        return DEFAULT_PRINTING_SETTINGS;
      }

      throw error;
    }
  }

  /**
   * Guarda la configuración de impresión mediante escritura atómica.
   */
  async save(settings: PrintingSettings): Promise<void> {
    const content: string = `${JSON.stringify(settings, null, 2)}\n`;

    await writeAtomicTextFile(this.filePath, content);
  }
}
