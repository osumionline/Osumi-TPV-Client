import VentaTicketBaiMapper from '@backend/application/ventas/venta-ticket-bai.mapper';
import VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import { TicketBaiClientError } from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type {
  TicketBaiClient,
  TicketBaiClientConfiguration,
  TicketBaiCreateInvoiceRequest,
  TicketBaiCreateInvoiceResult,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import type {
  InitializeVentaTicketBaiPendingRecordCommand,
  MarkVentaTicketBaiAcceptedRecordCommand,
  MarkVentaTicketBaiFailureRecordCommand,
} from '@backend/contracts/ventas/venta-ticket-bai-record-command.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type { VentaTicketBaiRecord } from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let configurationService: FakeConfigurationService;

let secretStorage: FakeSecretStorage;

let ticketsService: FakeVentasTicketsService;

let repository: FakeVentasTicketBaiRepository;

let client: FakeTicketBaiClient;

let service: VentasTicketBaiService;

describe('VentasTicketBaiService', (): void => {
  beforeEach((): void => {
    configurationService = new FakeConfigurationService();

    secretStorage = new FakeSecretStorage();

    ticketsService = new FakeVentasTicketsService();

    repository = new FakeVentasTicketBaiRepository();

    client = new FakeTicketBaiClient();

    service = new VentasTicketBaiService(
      configurationService,
      secretStorage,
      ticketsService,
      new VentaTicketBaiMapper(),
      repository,
      client,
    );
  });

  it('registra no_aplica cuando TicketBAI no está configurado', async (): Promise<void> => {
    configurationService.appData = {
      ...createAppData(),
      ticketBai: null,
    };

    await service.processInitial(15);

    expect(repository.record?.estado).toBe('no_aplica');

    expect(client.calls).toBe(0);
    expect(ticketsService.calls).toBe(0);
  });

  it('envía una venta ordinaria y persiste su aceptación', async (): Promise<void> => {
    await service.processInitial(15);

    expect(client.calls).toBe(1);

    expect(client.lastConfiguration).toEqual({
      token: 'ticketbai-token',
      issuerNif: 'B12345678',
      environment: 'test',
    });

    expect(client.lastRequest?.serie).toBe('TPV01');

    expect(client.lastRequest?.numero).toBe('000015');

    expect(repository.record?.estado).toBe('aceptada');

    expect(repository.record?.intentos).toBe(1);

    expect(repository.record?.huella).toBe('HUELLA-TBAI');
  });

  it('persiste un rechazo y no vuelve a enviarlo automáticamente', async (): Promise<void> => {
    client.error = new TicketBaiClientError(
      'rejected',
      'TicketBaiWS ha rechazado el documento.',
      '{"result":"ERROR"}',
    );

    await expect(service.processInitial(15)).rejects.toThrow(
      'TicketBaiWS ha rechazado el documento.',
    );

    expect(repository.record?.estado).toBe('rechazada');

    expect(client.calls).toBe(1);

    client.error = null;

    await service.processInitial(15);

    expect(client.calls).toBe(1);
    expect(repository.record?.estado).toBe('rechazada');
  });

  it('persiste un fallo temporal sin realizar retry automático', async (): Promise<void> => {
    client.error = new TicketBaiClientError(
      'temporary',
      'No se ha podido confirmar el resultado del envío.',
    );

    await expect(service.processInitial(15)).rejects.toThrow(
      'No se ha podido confirmar el resultado del envío.',
    );

    expect(repository.record?.estado).toBe('error_temporal');

    expect(client.calls).toBe(1);

    await service.processInitial(15).catch((): void => undefined);

    expect(client.calls).toBe(1);
  });

  it('persiste un fallo permanente', async (): Promise<void> => {
    client.error = new TicketBaiClientError(
      'permanent',
      'La configuración TicketBAI no es válida.',
    );

    await expect(service.processInitial(15)).rejects.toThrow(
      'La configuración TicketBAI no es válida.',
    );

    expect(repository.record?.estado).toBe('error_permanente');
  });

  it('no inicia el envío si falta el token seguro', async (): Promise<void> => {
    secretStorage.secrets = {
      ...createSecrets(),
      ticketBaiToken: null,
    };

    await expect(service.processInitial(15)).rejects.toThrow(
      'El token de TicketBAI no está configurado.',
    );

    expect(client.calls).toBe(0);
    expect(repository.record).toBeNull();
  });

  it('mantiene enviando ante un error externo no normalizado', async (): Promise<void> => {
    client.error = new Error('Fallo inesperado posterior al envío.');

    await expect(service.processInitial(15)).rejects.toThrow(
      'Fallo inesperado posterior al envío.',
    );

    expect(repository.record?.estado).toBe('enviando');

    expect(repository.record?.intentos).toBe(1);
  });
});

class FakeConfigurationService {
  appData: AppData | null = createAppData();

  /**
   * Devuelve la configuración preparada
   * para el caso de prueba.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(this.appData);
  }
}

class FakeSecretStorage {
  secrets: InstallationSecretsData | null = createSecrets();

  /**
   * Devuelve los secretos preparados
   * para el caso de prueba.
   */
  load(): Promise<InstallationSecretsData | null> {
    return Promise.resolve(this.secrets);
  }
}

class FakeVentasTicketsService {
  calls: number = 0;

  ticket: VentaTicketInterface | null = createTicket();

  /**
   * Devuelve el snapshot documental
   * configurado para el test.
   */
  getByVentaId(): Promise<VentaTicketInterface | null> {
    this.calls++;

    return Promise.resolve(this.ticket);
  }
}

class FakeTicketBaiClient implements TicketBaiClient {
  calls: number = 0;

  lastConfiguration: TicketBaiClientConfiguration | null = null;

  lastRequest: TicketBaiCreateInvoiceRequest | null = null;

  error: Error | null = null;

  /**
   * Simula la creación remota de un TicketBAI.
   */
  createInvoice(
    configuration: TicketBaiClientConfiguration,
    request: TicketBaiCreateInvoiceRequest,
  ): Promise<TicketBaiCreateInvoiceResult> {
    this.calls++;

    this.lastConfiguration = configuration;

    this.lastRequest = request;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve({
      huella: 'HUELLA-TBAI',
      qr: 'QR-TBAI',
      url: 'https://example.test/tbai',
      responsePayload: '{"result":"OK"}',
    });
  }
}

class FakeVentasTicketBaiRepository implements VentasTicketBaiRepository {
  record: VentaTicketBaiRecord | null = null;

  /**
   * Recupera el estado fiscal simulado.
   */
  findByVentaId(): Promise<VentaTicketBaiRecord | null> {
    return Promise.resolve(this.record);
  }

  /**
   * Inicializa el estado no aplicable.
   */
  initializeNoAplica(idVenta: number): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      this.record = createTicketBaiRecord(idVenta, 'no_aplica');
    }

    return Promise.resolve(this.record);
  }

  /**
   * Congela la identidad fiscal pendiente.
   */
  initializePending(
    command: InitializeVentaTicketBaiPendingRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      this.record = {
        ...createTicketBaiRecord(command.idVenta, 'pendiente'),
        entorno: command.entorno,
        nifEmisor: command.nifEmisor,
        serie: command.serie,
        numero: command.numero,
        solicitudPayload: command.solicitudPayload,
      };
    }

    return Promise.resolve(this.record);
  }

  /**
   * Adquiere el primer intento simulado.
   */
  beginInitialAttempt(): Promise<VentaTicketBaiRecord | null> {
    if (this.record === null || this.record.estado !== 'pendiente') {
      return Promise.resolve(null);
    }

    this.record = {
      ...this.record,
      estado: 'enviando',
      intentos: this.record.intentos + 1,
      enviadoAt: '2026-08-28T11:00:00.000Z',
    };

    return Promise.resolve(this.record);
  }

  /**
   * Simula la adquisición de un intento manual.
   *
   * No se utiliza en estos tests porque el servicio
   * inicial nunca debe realizar reintentos.
   */
  beginManualAttempt(): Promise<VentaTicketBaiRecord | null> {
    return Promise.resolve(null);
  }

  /**
   * Persiste una aceptación simulada.
   */
  markAccepted(command: MarkVentaTicketBaiAcceptedRecordCommand): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      return Promise.reject(new Error('No existe estado TicketBAI.'));
    }

    this.record = {
      ...this.record,
      estado: 'aceptada',
      huella: command.huella,
      qr: command.qr,
      url: command.url,
      respuestaPayload: command.respuestaPayload,
      ultimoError: null,
      aceptadoAt: '2026-08-28T11:00:01.000Z',
    };

    return Promise.resolve(this.record);
  }

  /**
   * Persiste un fallo fiscal simulado.
   */
  markFailure(command: MarkVentaTicketBaiFailureRecordCommand): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      return Promise.reject(new Error('No existe estado TicketBAI.'));
    }

    this.record = {
      ...this.record,
      estado: command.estado,
      ultimoError: command.ultimoError,
      respuestaPayload: command.respuestaPayload,
    };

    return Promise.resolve(this.record);
  }
}

/**
 * Construye la configuración normalizada
 * utilizada por los tests.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-08-28T10:00:00.000Z',

    nombre: 'Empresa test',
    nombreComercial: 'Comercio test',
    cif: 'B12345678',
    telefono: '',
    direccion: '',
    poblacion: '',
    email: '',

    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: 'Ticket',
      bodyTemplate: 'Ticket',
    },

    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [],

    ventaOnline: false,
    urlApi: '',

    emailSmtp: null,

    /*
     * Durante el desarrollo actual trabajamos
     * deliberadamente contra TEST.
     *
     * El default del producto continúa siendo
     * production.
     */
    ticketBai: {
      nif: 'B12345678',
      environment: 'test',
    },

    fechaCad: false,
    empleados: true,
  };
}

/**
 * Construye los secretos operacionales
 * utilizados en los tests.
 */
function createSecrets(): InstallationSecretsData {
  return {
    secretApi: '',
    backupApiKey: '',
    emailSmtpPass: null,
    ticketBaiToken: 'ticketbai-token',
  };
}

/**
 * Construye una venta ordinaria persistida
 * apta para el mapper TicketBAI.
 */
function createTicket(): VentaTicketInterface {
  return {
    id: 15,
    publicId: 'venta-15',
    serie: '',
    numero: 15,
    fecha: '2026-08-28T10:30:00.000Z',
    empleadoNombre: 'Empleado test',
    clienteNombre: null,
    totalCents: 1_210,
    ticketRevision: 1,
    ticketPdfRevision: 0,
    pagos: [],
    lineas: [
      {
        nombre: 'Artículo test',
        pvpMicros: 12_100_000,
        ivaBps: 2_100,
        importeMicros: 12_100_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
      },
    ],
  };
}

/**
 * Construye un estado fiscal mínimo
 * para el repository simulado.
 */
function createTicketBaiRecord(
  idVenta: number,
  estado: VentaTicketBaiRecord['estado'],
): VentaTicketBaiRecord {
  return {
    idVenta,
    entorno: null,
    nifEmisor: null,
    serie: null,
    numero: null,
    estado,
    identificador: null,
    huella: null,
    qr: null,
    url: null,
    intentos: 0,
    ultimoError: null,
    solicitudPayload: null,
    respuestaPayload: null,
    enviadoAt: null,
    aceptadoAt: null,
    createdAt: '2026-08-28T11:00:00.000Z',
    updatedAt: '2026-08-28T11:00:00.000Z',
  };
}
