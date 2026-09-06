import ClienteFacturaEmailService from '@backend/application/clientes/cliente-factura-email.service';
import ConfigurationService from '@backend/application/configuration/configuration.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
} from '@backend/contracts/email/email-sender.interface';
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

describe('ClienteFacturaEmailService', (): void => {
  beforeEach((): void => {
    appDataRepository = new FakeAppDataRepository();
    secretStorage = new FakeSecretStorage();
    documentoProvider = new FakeClienteFacturaDocumentoProvider();
    pdfProvider = new FakeClienteFacturaPdfProvider();
    emailSender = new FakeEmailSender();

    service = new ClienteFacturaEmailService(
      new ConfigurationService(appDataRepository),
      secretStorage,
      documentoProvider,
      pdfProvider,
      emailSender,
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
      fromName: 'Mi comercio',
      fromAddress: 'smtp@example.com',
      to: 'cliente@example.com',
      subject: 'Empresa fiscal - Factura 21_2026',
      text: 'Adjuntamos la factura 21_2026 de Mi comercio.',
    });

    const attachment = emailSender.requests[0]?.attachments[0];

    expect(attachment?.filename).toBe('factura-21_2026.pdf');
    expect(attachment?.contentType).toBe('application/pdf');
    expect(attachment?.content).toBe(pdfProvider.pdf);
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

class FakeClienteFacturaDocumentoProvider {
  documento: ClienteFacturaDocumentoInterface = createDocumento();
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;
  calls: number = 0;

  /**
   * Devuelve el documento configurado.
   */
  getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface> {
    this.calls += 1;
    this.receivedConsulta = consulta;

    return Promise.resolve(this.documento);
  }
}

class FakeClienteFacturaPdfProvider {
  readonly pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nfactura\n%%EOF');
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;
  calls: number = 0;

  /**
   * Devuelve los bytes definitivos simulados.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array> {
    this.calls += 1;
    this.receivedConsulta = consulta;

    return Promise.resolve(this.pdf);
  }
}

class FakeEmailSender implements EmailSender {
  readonly requests: EmailSendRequest[] = [];

  /**
   * Registra el envío solicitado.
   */
  send(request: EmailSendRequest): Promise<void> {
    this.requests.push(request);

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
