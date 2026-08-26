import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('JsonAppDataRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-app-data-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('aplica las plantillas de email por defecto a un app_data anterior', async (): Promise<void> => {
    const filePath: string = join(requireTempDirectory(), 'app_data.json');

    await writeFile(filePath, JSON.stringify(createLegacyAppData()), 'utf8');

    const repository: JsonAppDataRepository = new JsonAppDataRepository(filePath);

    const appData = await repository.load();

    expect(appData).not.toBeNull();

    expect(appData?.ticketEmail).toEqual({
      subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
    });
  });

  it('conserva las plantillas de email ya configuradas', async (): Promise<void> => {
    const filePath: string = join(requireTempDirectory(), 'app_data.json');

    await writeFile(
      filePath,
      JSON.stringify({
        ...createLegacyAppData(),

        ticketEmail: {
          subjectTemplate: 'Su ticket {referencia}',
          bodyTemplate: 'Gracias por comprar en {nombreNegocio}.',
        },
      }),
      'utf8',
    );

    const repository: JsonAppDataRepository = new JsonAppDataRepository(filePath);

    const appData = await repository.load();

    expect(appData?.ticketEmail).toEqual({
      subjectTemplate: 'Su ticket {referencia}',
      bodyTemplate: 'Gracias por comprar en {nombreNegocio}.',
    });
  });
});

/**
 * Construye un app_data válido anterior a la incorporación
 * de la configuración de plantillas de email.
 */
function createLegacyAppData(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    installedAt: '2026-08-01T10:00:00.000Z',

    nombre: 'Empresa',
    nombreComercial: 'Comercio',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',

    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],

    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [30],

    ventaOnline: false,
    urlApi: '',

    emailSmtp: null,
    ticketBai: null,

    fechaCad: false,
    empleados: false,
  };
}

/**
 * Devuelve obligatoriamente el directorio temporal activo.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está inicializado.');
  }

  return tempDirectory;
}
