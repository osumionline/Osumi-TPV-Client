import type AppDataRepository from '@backend/contracts/app-data.repository';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown): boolean => typeof item === 'number' && Number.isFinite(item))
  );
}

function isAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  const stringProperties: readonly string[] = [
    'installedAt',
    'nombre',
    'nombreComercial',
    'cif',
    'telefono',
    'direccion',
    'poblacion',
    'email',
    'twitter',
    'facebook',
    'instagram',
    'web',
    'tipoIva',
    'urlApi',
  ];

  const booleanProperties: readonly string[] = ['ventaOnline', 'fechaCad', 'empleados'];

  const numberProperties: readonly string[] = [
    'schemaVersion',
    'cajaInicial',
    'ticketInicial',
    'facturaInicial',
  ];

  const validStrings: boolean = stringProperties.every(
    (property: string): boolean => typeof data[property] === 'string',
  );

  const validBooleans: boolean = booleanProperties.every(
    (property: string): boolean => typeof data[property] === 'boolean',
  );

  const validNumbers: boolean = numberProperties.every(
    (property: string): boolean =>
      typeof data[property] === 'number' && Number.isFinite(data[property]),
  );

  return (
    validStrings &&
    validBooleans &&
    validNumbers &&
    isNumberArray(data['ivaList']) &&
    isNumberArray(data['reList']) &&
    isNumberArray(data['marginList']) &&
    (data['tipoIva'] === 'iva' || data['tipoIva'] === 're')
  );
}

export default class JsonAppDataRepository implements AppDataRepository {
  constructor(private readonly filePath: string) {}

  async exists(): Promise<boolean> {
    const appData: AppData | null = await this.load();

    return appData !== null;
  }

  async load(): Promise<AppData | null> {
    try {
      const content: string = await readFile(this.filePath, {
        encoding: 'utf8',
      });

      const parsed: unknown = JSON.parse(content);

      if (!isAppData(parsed)) {
        throw new Error('El archivo app_data.json no tiene una estructura válida.');
      }

      return parsed;
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async save(appData: AppData): Promise<void> {
    const temporaryFilePath: string = `${this.filePath}.tmp`;

    const content: string = `${JSON.stringify(appData, null, 2)}\n`;

    await writeFile(temporaryFilePath, content, {
      encoding: 'utf8',
      mode: 0o600,
    });

    await rename(temporaryFilePath, this.filePath);
  }

  async delete(): Promise<void> {
    await rm(this.filePath, {
      force: true,
    });
  }
}
