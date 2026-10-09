import ClienteFacturaEmailService from '@backend/application/clientes/cliente-factura-email.service';
import ConfigurationService from '@backend/application/configuration/configuration.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
} from '@backend/contracts/email/email-sender.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let appDataRepository: FakeAppDataRepository;
let secretStorage: FakeSecretStorage;
let documentoProvider: FakeClienteFacturaDocumentoProvider;
let pdfProvider: FakeClienteFacturaPdfProvider;
let emailSender: FakeEmailSender;
let service: ClienteFacturaEmailService;
let applicationLogger: TestApplicationLogger;

describe('ClienteFacturaEmailService', (): void => {
  beforeEach((): void => {
    appDataRepository = new FakeAppDataRepository();
    secretStorage = new FakeSecretStorage();
    documentoProvider = new FakeClienteFacturaDocumentoProvider();
    pdfProvider = new FakeClienteFacturaPdfProvider();
    emailSender = new FakeEmailSender();
    applicationLogger = new TestApplicationLogger();

    service = new ClienteFacturaEmailService(
      new ConfigurationService(appDataRepository, secretStorage, createNoopLogoStorage()),
      secretStorage,
      documentoProvider,
      pdfProvider,
      emailSender,
      applicationLogger,
    );
  });

  it('envía exactamente el PDF definitivo usando el nombre comercial', async (): Promise<void> => {
    await service.send({
      clientePublicId: '  cliente-1  ',
      facturaPublicId: '  factura-1  ',
      destinatario: ' cliente@example.com ',
    });

    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    };

    expect(documentoProvider.receivedConsulta).toEqual(consulta);
    expect(pdfProvider.receivedConsulta).toEqual(consulta);

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
      subject: 'Empresa fiscal - Factura 21_2026',
      text: 'Adjuntamos la factura 21_2026 de Empresa fiscal.',
    });

    const attachment = emailSender.requests[0]?.attachments[0];

    expect(attachment?.filename).toBe('factura-21_2026.pdf');
    expect(attachment?.contentType).toBe('application/pdf');
    expect(attachment?.content).toBe(pdfProvider.pdf);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza un destinatario no válido antes de enviar', async (): Promise<void> => {
    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'email-invalido',
      }),
    ).rejects.toThrow('La dirección de email del destinatario no es válida.');

    expect(emailSender.requests).toEqual([]);
    expect(documentoProvider.calls).toBe(0);
    expect(pdfProvider.calls).toBe(0);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza el envío cuando SMTP no está configurado', async (): Promise<void> => {
    appDataRepository.appData = {
      ...createAppData(),
      emailSmtp: null,
    };

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('El envío de emails por SMTP no está configurado.');

    expect(emailSender.requests).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('rechaza el envío cuando falta la contraseña SMTP', async (): Promise<void> => {
    secretStorage.secrets = {
      ...createSecrets(),
      emailSmtpPass: null,
    };

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('La contraseña SMTP no está disponible.');

    expect(emailSender.requests).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('no permite enviar borradores ni facturas anuladas', async (): Promise<void> => {
    documentoProvider.documento = {
      ...createDocumento(),
      numero: null,
      numeroFactura: '_2026',
      estado: 'borrador',
      previsualizacion: true,
      fechaEmision: null,
    };

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('Solo se pueden enviar por email facturas emitidas.');

    expect(pdfProvider.calls).toBe(0);
    expect(emailSender.requests).toEqual([]);

    documentoProvider.documento = {
      ...createDocumento(),
      estado: 'anulada',
      fechaAnulacion: '2026-09-07T10:00:00.000Z',
    };

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('Solo se pueden enviar por email facturas emitidas.');

    expect(pdfProvider.calls).toBe(0);
    expect(emailSender.requests).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al preparar el documento', async (): Promise<void> => {
    const error: Error = new Error('SQLite invoice document read failed.');

    documentoProvider.error = error;

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toBe(error);

    expect(pdfProvider.calls).toBe(0);
    expect(emailSender.requests).toEqual([]);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'prepare-invoice-email',
        message: 'No se ha podido preparar una factura para enviarla por email.',
        error,
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });

  it('registra una incoherencia de identidad documental', async (): Promise<void> => {
    documentoProvider.documento = {
      ...createDocumento(),
      facturaPublicId: 'otra-factura',
    };

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toThrow('El documento recuperado no corresponde a la factura solicitada.');

    expect(pdfProvider.calls).toBe(0);
    expect(emailSender.requests).toEqual([]);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'prepare-invoice-email',
        message: 'No se ha podido preparar una factura para enviarla por email.',
        error: expect.objectContaining({
          message: 'El documento recuperado no corresponde a la factura solicitada.',
        }),
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });

  it('no duplica el logging cuando falla el PDF definitivo', async (): Promise<void> => {
    const error: Error = new Error('No se ha podido materializar el PDF.');

    pdfProvider.error = error;

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toBe(error);

    expect(emailSender.requests).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra el fallo SMTP sin incorporar información sensible al log', async (): Promise<void> => {
    const error: Error = new Error('Falló smtp.example.com cliente@example.com smtp-password');

    emailSender.sendError = error;

    await expect(
      service.send({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
        destinatario: 'cliente@example.com',
      }),
    ).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'send-invoice-email',
        message: 'No se ha podido enviar una factura por email.',
        error: expect.objectContaining({
          message: 'El transporte SMTP no ha podido completar el envío de la factura.',
        }),
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);

    expect(applicationLogger.warnEvents[0]?.error).not.toBe(error);
  });
});

/**
 * Logger controlado utilizado por los tests
 * del envío de facturas por email.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos emitidos durante las pruebas.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No existen escrituras pendientes
   * en este logger de memoria.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

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

class FakeClienteFacturaDocumentoProvider {
  documento: ClienteFacturaDocumentoInterface = createDocumento();
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;
  calls: number = 0;
  error: Error | null = null;

  /**
   * Devuelve el documento configurado o simula
   * una incidencia durante su recuperación.
   */
  getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface> {
    this.calls += 1;
    this.receivedConsulta = consulta;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.documento);
  }
}

class FakeClienteFacturaPdfProvider {
  readonly pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nfactura\n%%EOF');
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;
  calls: number = 0;
  error: Error | null = null;

  /**
   * Devuelve los bytes definitivos simulados o
   * propaga el fallo preparado para la prueba.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array> {
    this.calls += 1;
    this.receivedConsulta = consulta;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.pdf);
  }
}

class FakeEmailSender implements EmailSender {
  readonly requests: EmailSendRequest[] = [];

  sendError: Error | null = null;

  /**
   * Registra el envío solicitado y permite
   * simular un fallo del transporte.
   */
  send(request: EmailSendRequest): Promise<void> {
    this.requests.push(request);

    if (this.sendError !== null) {
      return Promise.reject(this.sendError);
    }

    return Promise.resolve();
  }
}

/**
 * Construye la configuración operacional del test.
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
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Adjuntamos su ticket.',
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

    backupAutomaticTime: '03:00',
    fechaCad: false,
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
 * Construye una factura documental emitida.
 */
function createDocumento(): ClienteFacturaDocumentoInterface {
  return {
    facturaPublicId: 'factura-1',
    serie: '',
    numero: 21,
    year: 2026,
    numeroFactura: '21_2026',
    estado: 'emitida',
    previsualizacion: false,
    generatedAt: '2026-09-06T10:00:00.000Z',
    fechaDocumento: '2026-09-06T10:00:00.000Z',
    fechaCreacion: '2026-09-05T10:00:00.000Z',
    fechaEmision: '2026-09-06T10:00:00.000Z',
    fechaAnulacion: null,
    emisor: {
      nombre: 'Empresa fiscal',
      nombreComercial: 'Mi comercio',
      cif: 'B12345678',
      telefono: '944000000',
      direccion: 'Gran Vía 1',
      poblacion: 'Bilbao',
      email: 'tienda@example.com',
      web: '',
    },
    cliente: {
      nombreApellidos: 'Cliente',
      dniCif: '12345678Z',
      telefono: null,
      email: 'cliente@example.com',
      direccion: 'Calle Cliente 1',
      codigoPostal: '48001',
      poblacion: 'Bilbao',
      provinciaId: 48,
    },
    ventas: [
      {
        publicId: 'venta-1',
        serie: '',
        numero: 101,
        fecha: '2026-09-05T10:00:00.000Z',
        pvpCents: 1_210,
        baseCents: 1_000,
        subtotalCents: 1_000,
        ivaCents: 210,
        descuentoCents: 0,
        totalCents: 1_210,
        lineas: [],
      },
    ],
    impuestos: [
      {
        ivaBps: 2_100,
        baseCents: 1_000,
        cuotaCents: 210,
        totalCents: 1_210,
      },
    ],
    subtotalCents: 1_000,
    descuentoCents: 0,
    totalCents: 1_210,
  };
}

/**
 * Crea un almacenamiento de logo neutro para pruebas
 * que no necesitan manipular el logo de la aplicación.
 */
function createNoopLogoStorage(): LogoStorage {
  return {
    exists: (): Promise<boolean> => Promise.resolve(false),

    save: (): Promise<void> => Promise.resolve(),

    delete: (): Promise<void> => Promise.resolve(),
  };
}
