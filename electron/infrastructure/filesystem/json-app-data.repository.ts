import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type EmailSmtpConfig from '@desktop-contracts/configuration/email-smtp-config.interface';
import type TicketBaiConfig from '@desktop-contracts/configuration/ticket-bai-config.interface';
import {
  DEFAULT_TICKET_BAI_ENVIRONMENT,
  type TicketBaiEnvironment,
} from '@desktop-contracts/configuration/ticket-bai-environment.type';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
  type TicketEmailConfig,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown): boolean => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/**
 * Comprueba si un valor representa un entorno
 * TicketBAI reconocido por la aplicación.
 */
function isTicketBaiEnvironment(value: unknown): value is TicketBaiEnvironment {
  return value === 'test' || value === 'production';
}

function isEmailSmtpConfig(value: unknown): value is EmailSmtpConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;
  const port: unknown = data['port'];

  return (
    isNullableString(data['host']) &&
    (port === null ||
      (typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535)) &&
    isNullableString(data['secure']) &&
    isNullableString(data['user'])
  );
}

/**
 * Comprueba la estructura persistida de la configuración
 * de las plantillas de email del ticket.
 */
function isTicketEmailConfig(value: unknown): value is TicketEmailConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  return typeof data['subjectTemplate'] === 'string' && typeof data['bodyTemplate'] === 'string';
}

type StoredTicketBaiConfig = Omit<TicketBaiConfig, 'environment'> & {
  readonly environment?: TicketBaiEnvironment;
};

/**
 * Comprueba tanto la configuración TicketBAI
 * actual como el formato anterior sin entorno.
 */
function isStoredTicketBaiConfig(value: unknown): value is StoredTicketBaiConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  return (
    isNullableString(data['nif']) &&
    (data['environment'] === undefined || isTicketBaiEnvironment(data['environment']))
  );
}

type StoredAppData = Omit<AppData, 'frasesTicket' | 'ticketEmail' | 'emailSmtp' | 'ticketBai'> & {
  readonly frasesTicket?: readonly string[];
  readonly ticketEmail?: TicketEmailConfig;
  readonly emailSmtp?: EmailSmtpConfig | null;
  readonly ticketBai?: StoredTicketBaiConfig | null;
};

function isStoredAppData(value: unknown): value is StoredAppData {
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
  const numberProperties: readonly string[] = ['schemaVersion'];

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

  const validTicketPhrases: boolean =
    data['frasesTicket'] === undefined || isStringArray(data['frasesTicket']);

  const validTicketEmail: boolean =
    data['ticketEmail'] === undefined || isTicketEmailConfig(data['ticketEmail']);

  const validEmailSmtp: boolean =
    data['emailSmtp'] === undefined ||
    data['emailSmtp'] === null ||
    isEmailSmtpConfig(data['emailSmtp']);

  const validTicketBai: boolean =
    data['ticketBai'] === undefined ||
    data['ticketBai'] === null ||
    isStoredTicketBaiConfig(data['ticketBai']);

  return (
    validStrings &&
    validBooleans &&
    validNumbers &&
    validTicketPhrases &&
    validTicketEmail &&
    validEmailSmtp &&
    validTicketBai &&
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

      if (!isStoredAppData(parsed)) {
        throw new Error('El archivo app_data.json no tiene una estructura válida.');
      }

      return {
        ...parsed,

        frasesTicket: parsed.frasesTicket === undefined ? [] : [...parsed.frasesTicket],

        ticketEmail:
          parsed.ticketEmail === undefined
            ? {
                subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
                bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
              }
            : {
                subjectTemplate: parsed.ticketEmail.subjectTemplate,
                bodyTemplate: parsed.ticketEmail.bodyTemplate,
              },

        emailSmtp: parsed.emailSmtp ?? null,
        ticketBai:
          parsed.ticketBai === undefined || parsed.ticketBai === null
            ? null
            : {
                nif: parsed.ticketBai.nif,
                environment: parsed.ticketBai.environment ?? DEFAULT_TICKET_BAI_ENVIRONMENT,
              },
      };
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
