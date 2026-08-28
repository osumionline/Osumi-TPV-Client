import ConfigurationService from '@backend/application/configuration/configuration.service';
import VentasTicketEmailService from '@backend/application/ventas/ventas-ticket-email.service';
import VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
} from '@backend/contracts/email/email-sender.interface';
import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type { VentaTicketRecord } from '@backend/domain/ventas/venta-ticket-record.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let appDataRepository: FakeAppDataRepository;
let secretStorage: FakeSecretStorage;
let ventasTicketsRepository: FakeVentasTicketsRepository;
let pdfStorage: FakeVentaTicketPdfStorage;
let emailSender: FakeEmailSender;
let service: VentasTicketEmailService;

describe('VentasTicketEmailService', (): void => {
  beforeEach((): void => {
    appDataRepository = new FakeAppDataRepository();

    secretStorage = new FakeSecretStorage();

    ventasTicketsRepository = new FakeVentasTicketsRepository();

    pdfStorage = new FakeVentaTicketPdfStorage();

    emailSender = new FakeEmailSender();

    const configurationService: ConfigurationService = new ConfigurationService(appDataRepository);

    const ventasTicketsService: VentasTicketsService = new VentasTicketsService(
      ventasTicketsRepository,
      pdfStorage,
    );

    service = new VentasTicketEmailService(
      configurationService,
      secretStorage,
      ventasTicketsService,
      emailSender,
    );
  });

  it('envía el PDF vigente usando configuración y secreto SMTP', async (): Promise<void> => {
    await service.send({
      idVenta: 123,
      destinatario: ' cliente@example.com ',
    });

    expect(emailSender.requests).toHaveLength(1);

    expect(emailSender.requests[0]).toMatchObject({
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        security: 'tls',
        user: 'smtp@example.com',
        pass: 'smtp-password',
      },

      fromName: 'Empresa fiscal',
      fromAddress: 'smtp@example.com',
      to: 'cliente@example.com',

      subject: 'Mi comercio - Ticket A-456',

      text: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
    });

    const attachment = emailSender.requests[0]?.attachments[0];

    expect(attachment?.filename).toBe('ticket-A-456.pdf');

    expect(attachment?.contentType).toBe('application/pdf');

    expect(attachment?.content).toEqual(pdfStorage.readResult);
  });

  it('rechaza el envío si el PDF vigente no está disponible', async (): Promise<void> => {
    pdfStorage.readResult = null;

    await expect(
      service.send({
        idVenta: 123,
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('El PDF vigente del ticket no está disponible.');

    expect(emailSender.requests).toEqual([]);
  });

  it('rechaza el envío cuando SMTP no está configurado', async (): Promise<void> => {
    const appData: AppData = createAppData();

    appDataRepository.appData = {
      ...appData,
      emailSmtp: null,
    };

    await expect(
      service.send({
        idVenta: 123,
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('El envío de emails por SMTP no está configurado.');

    expect(emailSender.requests).toEqual([]);
  });

  it('rechaza el envío cuando falta la contraseña SMTP', async (): Promise<void> => {
    secretStorage.secrets = {
      ...createSecrets(),
      emailSmtpPass: null,
    };

    await expect(
      service.send({
        idVenta: 123,
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('La contraseña SMTP no está disponible.');

    expect(emailSender.requests).toEqual([]);
  });

  it('rechaza un destinatario no válido', async (): Promise<void> => {
    await expect(
      service.send({
        idVenta: 123,
        destinatario: 'email-invalido',
      }),
    ).rejects.toThrow('La dirección de email del destinatario no es válida.');

    expect(emailSender.requests).toEqual([]);
  });

  it('no envía un PDF si la revisión cambia durante la preparación', async (): Promise<void> => {
    ventasTicketsRepository.ticketSequence = [
      createTicketRecord(),
      createTicketRecord(),
      createTicketRecord(),
      createTicketRecord({
        ticketRevision: 3,
        ticketPdfRevision: 2,
      }),
    ];

    await expect(
      service.send({
        idVenta: 123,
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('El ticket ha cambiado mientras se preparaba el email.');

    expect(emailSender.requests).toEqual([]);
  });
});

class FakeAppDataRepository implements AppDataRepository {
  appData: AppData | null = createAppData();

  /**
   * Indica si existe configuración simulada.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.appData !== null);
  }

  /**
   * Devuelve la configuración simulada.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(this.appData);
  }

  /**
   * Sustituye la configuración simulada.
   */
  save(appData: AppData): Promise<void> {
    this.appData = appData;

    return Promise.resolve();
  }

  /**
   * Elimina la configuración simulada.
   */
  delete(): Promise<void> {
    this.appData = null;

    return Promise.resolve();
  }
}

class FakeSecretStorage implements SecretStorage {
  secrets: InstallationSecretsData | null = createSecrets();

  /**
   * Indica si existen secretos simulados.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.secrets !== null);
  }

  /**
   * Devuelve los secretos simulados.
   */
  load(): Promise<InstallationSecretsData | null> {
    return Promise.resolve(this.secrets);
  }

  /**
   * Sustituye los secretos simulados.
   */
  save(secrets: InstallationSecretsData): Promise<void> {
    this.secrets = secrets;

    return Promise.resolve();
  }

  /**
   * Elimina los secretos simulados.
   */
  delete(): Promise<void> {
    this.secrets = null;

    return Promise.resolve();
  }
}

class FakeVentasTicketsRepository implements VentasTicketsRepository {
  ticketSequence: VentaTicketRecord[] = [];

  ticket: VentaTicketRecord | null = createTicketRecord();

  /**
   * Devuelve el siguiente snapshot simulado.
   */
  findByVentaId(): Promise<VentaTicketRecord | null> {
    const next: VentaTicketRecord | undefined = this.ticketSequence.shift();

    return Promise.resolve(next ?? this.ticket);
  }

  /**
   * Simula la confirmación CAS del PDF.
   */
  markPdfRevision(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class FakeVentaTicketPdfStorage implements VentaTicketPdfStorage {
  readResult: Uint8Array | null = createPdf();

  /**
   * Simula la existencia física del PDF.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.readResult !== null);
  }

  /**
   * Devuelve el PDF configurado.
   */
  read(): Promise<Uint8Array | null> {
    return Promise.resolve(this.readResult);
  }

  /**
   * Sustituye el PDF simulado.
   */
  save(_idVenta: number, pdf: Uint8Array): Promise<void> {
    this.readResult = pdf;

    return Promise.resolve();
  }
}

class FakeEmailSender implements EmailSender {
  readonly requests: EmailSendRequest[] = [];

  /**
   * Registra el email solicitado.
   */
  send(request: EmailSendRequest): Promise<void> {
    this.requests.push(request);

    return Promise.resolve();
  }
}

/**
 * Construye una configuración operacional válida.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-08-01T10:00:00.000Z',

    nombre: 'Empresa fiscal',
    nombreComercial: 'Mi comercio',
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

    ticketEmail: {
      subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,

      bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
    },

    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [30],

    ventaOnline: false,
    urlApi: '',

    emailSmtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: 'tls',
      user: 'smtp@example.com',
    },

    ticketBai: null,

    fechaCad: false,
    empleados: false,
  };
}

/**
 * Construye los secretos operacionales del test.
 */
function createSecrets(): InstallationSecretsData {
  return {
    secretApi: '',
    backupApiKey: '',
    emailSmtpPass: 'smtp-password',
    ticketBaiToken: null,
  };
}

/**
 * Construye el snapshot documental simulado.
 */
function createTicketRecord(
  overrides: {
    readonly ticketRevision?: number;
    readonly ticketPdfRevision?: number;
  } = {},
): VentaTicketRecord {
  return {
    id: 123,
    publicId: 'venta-123',

    serie: 'A',
    numero: 456,

    fecha: '2026-08-26T18:00:00.000Z',

    empleadoNombre: 'Empleado',
    clienteNombre: 'Cliente',
    ticketBai: null,

    totalCents: 2_000,

    ticketRevision: overrides.ticketRevision ?? 2,

    ticketPdfRevision: overrides.ticketPdfRevision ?? 2,

    pagos: [],
    lineas: [],
  };
}

/**
 * Construye un PDF mínimo para el test.
 */
function createPdf(): Uint8Array {
  return new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');
}
