import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';
import { readFile, rename, writeFile } from 'node:fs/promises';

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

  async save(settings: PrintingSettings): Promise<void> {
    const temporaryFilePath: string = `${this.filePath}.tmp`;

    const content: string = `${JSON.stringify(settings, null, 2)}\n`;

    await writeFile(temporaryFilePath, content, {
      encoding: 'utf8',
      mode: 0o600,
    });

    await rename(temporaryFilePath, this.filePath);
  }
}
