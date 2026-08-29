import VentaTicketBaiMapper from '@backend/application/ventas/venta-ticket-bai.mapper';
import VentasTicketBaiService from '@backend/application/ventas/ventas-ticket-bai.service';
import { TicketBaiClientError } from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type {
  TicketBaiClient,
  TicketBaiClientConfiguration,
  TicketBaiCreateInvoiceRequest,
  TicketBaiCreateInvoiceResult,
  TicketBaiGetInvoiceResult,
  TicketBaiInvoiceReference,
  TicketBaiResendInvoiceResult,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import type {
  InitializeVentaTicketBaiPendingRecordCommand,
  MarkVentaTicketBaiAcceptedRecordCommand,
  MarkVentaTicketBaiAttemptAcknowledgedRecordCommand,
  MarkVentaTicketBaiFailureRecordCommand,
  MarkVentaTicketBaiReconciledRejectedRecordCommand,
  MarkVentaTicketBaiRemotePendingRecordCommand,
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
    expect(repository.record?.respuestaPayload).toBe('{"result":"OK"}');
    expect(repository.record?.intentos).toBe(1);
    expect(repository.record?.huella).toBe('HUELLA-TBAI');
  });

  it('persiste un PENDING remoto y no vuelve a enviarlo automáticamente', async (): Promise<void> => {
    client.status = 'pending';

    await service.processInitial(15);

    expect(client.calls).toBe(1);
    expect(repository.record?.estado).toBe('pendiente_remoto');
    expect(repository.record?.intentos).toBe(1);
    expect(repository.record?.huella).toBe('HUELLA-TBAI');
    expect(repository.record?.qr).toBe('QR-TBAI');
    expect(repository.record?.url).toBe('https://example.test/tbai');
    expect(repository.record?.respuestaPayload).toBe('{"result":"PENDING"}');
    expect(repository.record?.aceptadoAt).toBeNull();

    await service.processInitial(15);

    expect(client.calls).toBe(1);
    expect(repository.record?.estado).toBe('pendiente_remoto');
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

  it('reconcilia un PENDING usando la identidad fiscal congelada', async (): Promise<void> => {
    repository.record = createReconcilableRecord();

    configurationService.appData = {
      ...createAppData(),
      ticketBai: {
        nif: 'B11111111',
        environment: 'production',
      },
    };

    client.getStatus = 'pending';

    await service.reconcile(15);

    expect(client.getCalls).toBe(1);
    expect(client.lastGetConfiguration).toEqual({
      token: 'ticketbai-token',
      issuerNif: 'B87654321',
      environment: 'test',
    });
    expect(client.lastReference).toEqual({
      serie: 'TPV01',
      numero: '000015',
    });
    expect(repository.record?.estado).toBe('pendiente_remoto');
    expect(repository.record?.huella).toBe('HUELLA-GET');
    expect(repository.record?.qr).toBe('QR-GET');
    expect(repository.record?.url).toBe('https://example.test/tbai/get');
  });

  it('reconcilia como aceptada una factura remota procesada correctamente', async (): Promise<void> => {
    repository.record = createReconcilableRecord();
    client.getStatus = 'accepted';

    await service.reconcile(15);

    expect(client.getCalls).toBe(1);
    expect(repository.record?.estado).toBe('aceptada');
    expect(repository.record?.huella).toBe('HUELLA-GET');
    expect(repository.record?.qr).toBe('QR-GET');
    expect(repository.record?.url).toBe('https://example.test/tbai/get');
    expect(repository.record?.aceptadoAt).not.toBeNull();
  });

  it('reconcilia como rechazada una factura cuyo estado remoto es ERROR', async (): Promise<void> => {
    repository.record = createReconcilableRecord();
    client.getStatus = 'rejected';

    await service.reconcile(15);

    expect(client.getCalls).toBe(1);
    expect(repository.record?.estado).toBe('rechazada');
    expect(repository.record?.huella).toBe('HUELLA-GET');
    expect(repository.record?.qr).toBe('QR-GET');
    expect(repository.record?.url).toBe('https://example.test/tbai/get');
    expect(repository.record?.ultimoError).toBe(
      'TicketBaiWS informa que la factura se encuentra en estado ERROR.',
    );
  });

  it('mantiene intacto el estado local cuando falla la consulta remota', async (): Promise<void> => {
    repository.record = createReconcilableRecord();

    const initialRecord: VentaTicketBaiRecord = {
      ...repository.record,
    };

    client.getError = new Error('No se ha podido consultar TicketBaiWS.');

    await expect(service.reconcile(15)).rejects.toThrow('No se ha podido consultar TicketBaiWS.');

    expect(client.getCalls).toBe(1);
    expect(repository.record).toEqual(initialRecord);
  });

  it('reconcilia un error temporal antes de realizar cualquier nuevo envío', async (): Promise<void> => {
    repository.record = createReconcilableRecord('error_temporal');
    client.getStatus = 'accepted';

    await service.reconcile(15);

    expect(client.getCalls).toBe(1);
    expect(repository.record?.estado).toBe('aceptada');
  });

  it('no consulta TicketBaiWS cuando el estado fiscal ya es definitivo', async (): Promise<void> => {
    repository.record = createReconcilableRecord('aceptada');

    await service.reconcile(15);

    expect(client.getCalls).toBe(0);
    expect(repository.record?.estado).toBe('aceptada');
  });

  it('reenvía una factura rechazada usando su identidad fiscal congelada', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    configurationService.appData = {
      ...createAppData(),
      ticketBai: {
        nif: 'B11111111',
        environment: 'production',
      },
    };

    await service.retry(15);

    expect(client.resendCalls).toBe(1);
    expect(client.lastResendConfiguration).toEqual({
      token: 'ticketbai-token',
      issuerNif: 'B87654321',
      environment: 'test',
    });
    expect(client.lastResendReference).toEqual({
      serie: 'TPV01',
      numero: '000015',
    });

    expect(repository.record?.estado).toBe('enviando');
    expect(repository.record?.intentos).toBe(2);
    expect(repository.record?.ultimoError).toBeNull();
    expect(repository.record?.respuestaPayload).toBe('{"result":"OK","return":{}}');

    expect(client.getCalls).toBe(0);
  });

  it('persiste un nuevo rechazo cuando falla así el reenvío manual', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    client.resendError = new TicketBaiClientError(
      'rejected',
      'TicketBaiWS sigue rechazando la factura.',
      '{"result":"ERROR"}',
    );

    await expect(service.retry(15)).rejects.toThrow('TicketBaiWS sigue rechazando la factura.');

    expect(client.resendCalls).toBe(1);
    expect(repository.record?.estado).toBe('rechazada');
    expect(repository.record?.intentos).toBe(2);
    expect(repository.record?.ultimoError).toBe('TicketBaiWS sigue rechazando la factura.');
    expect(repository.record?.respuestaPayload).toBe('{"result":"ERROR"}');
  });

  it('persiste error_temporal cuando el reenvío queda ambiguo de forma conocida', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    client.resendError = new TicketBaiClientError(
      'temporary',
      'No se ha podido confirmar el resultado del reenvío.',
    );

    await expect(service.retry(15)).rejects.toThrow(
      'No se ha podido confirmar el resultado del reenvío.',
    );

    expect(client.resendCalls).toBe(1);
    expect(repository.record?.estado).toBe('error_temporal');
    expect(repository.record?.intentos).toBe(2);
    expect(repository.record?.ultimoError).toBe(
      'No se ha podido confirmar el resultado del reenvío.',
    );
  });

  it('no permite reintentar manualmente un error temporal', async (): Promise<void> => {
    repository.record = {
      ...createReconcilableRecord('error_temporal'),
      intentos: 2,
      ultimoError: 'No se ha podido confirmar el resultado del reenvío.',
    };

    await service.retry(15);

    expect(client.resendCalls).toBe(0);
    expect(repository.record?.estado).toBe('error_temporal');
    expect(repository.record?.intentos).toBe(2);
  });

  it('persiste error_permanente cuando el reenvío falla de forma definitiva', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    client.resendError = new TicketBaiClientError(
      'permanent',
      'La configuración utilizada por TicketBAI no es válida.',
    );

    await expect(service.retry(15)).rejects.toThrow(
      'La configuración utilizada por TicketBAI no es válida.',
    );

    expect(client.resendCalls).toBe(1);
    expect(repository.record?.estado).toBe('error_permanente');
    expect(repository.record?.intentos).toBe(2);
    expect(repository.record?.ultimoError).toBe(
      'La configuración utilizada por TicketBAI no es válida.',
    );
  });

  it('no permite reintentar manualmente un error permanente', async (): Promise<void> => {
    repository.record = {
      ...createReconcilableRecord('error_permanente'),
      intentos: 2,
      ultimoError: 'La configuración utilizada por TicketBAI no es válida.',
    };

    await service.retry(15);

    expect(client.resendCalls).toBe(0);
    expect(repository.record?.estado).toBe('error_permanente');
    expect(repository.record?.intentos).toBe(2);
  });

  it('mantiene enviando ante un fallo no normalizado durante el reenvío', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    client.resendError = new Error('La conexión se perdió después de enviar la petición.');

    await expect(service.retry(15)).rejects.toThrow(
      'La conexión se perdió después de enviar la petición.',
    );

    expect(client.resendCalls).toBe(1);
    expect(repository.record?.estado).toBe('enviando');
    expect(repository.record?.intentos).toBe(2);
  });

  it('solo realiza un resend ante dos reintentos manuales concurrentes', async (): Promise<void> => {
    repository.record = createRejectedRecord();

    await Promise.all([service.retry(15), service.retry(15)]);

    expect(client.resendCalls).toBe(1);
    expect(repository.record?.estado).toBe('enviando');
    expect(repository.record?.intentos).toBe(2);
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
  status: TicketBaiCreateInvoiceResult['status'] = 'accepted';
  getCalls: number = 0;
  lastGetConfiguration: TicketBaiClientConfiguration | null = null;
  lastReference: TicketBaiInvoiceReference | null = null;
  getError: Error | null = null;
  getStatus: TicketBaiGetInvoiceResult['status'] = 'pending';
  resendCalls: number = 0;
  lastResendConfiguration: TicketBaiClientConfiguration | null = null;
  lastResendReference: TicketBaiInvoiceReference | null = null;
  resendError: Error | null = null;
  resendResponsePayload: string = '{"result":"OK","return":{}}';

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
      status: this.status,
      huella: 'HUELLA-TBAI',
      qr: 'QR-TBAI',
      url: 'https://example.test/tbai',
      responsePayload: this.status === 'pending' ? '{"result":"PENDING"}' : '{"result":"OK"}',
    });
  }

  /**
   * Simula la consulta remota de una factura TicketBAI.
   */
  getInvoice(
    configuration: TicketBaiClientConfiguration,
    reference: TicketBaiInvoiceReference,
  ): Promise<TicketBaiGetInvoiceResult> {
    this.getCalls++;
    this.lastGetConfiguration = configuration;
    this.lastReference = reference;

    if (this.getError !== null) {
      return Promise.reject(this.getError);
    }

    return Promise.resolve({
      status: this.getStatus,
      huella: 'HUELLA-GET',
      qr: 'QR-GET',
      url: 'https://example.test/tbai/get',
      responsePayload: `{"result":"OK","return":{"status":"${this.getStatus}"}}`,
    });
  }

  /**
   * Simula la solicitud de reenvío de una
   * factura TicketBAI ya existente.
   */
  resendInvoice(
    configuration: TicketBaiClientConfiguration,
    reference: TicketBaiInvoiceReference,
  ): Promise<TicketBaiResendInvoiceResult> {
    this.resendCalls++;
    this.lastResendConfiguration = configuration;
    this.lastResendReference = reference;

    if (this.resendError !== null) {
      return Promise.reject(this.resendError);
    }

    return Promise.resolve({
      responsePayload: this.resendResponsePayload,
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
   * Adquiere un intento manual únicamente
   * desde un rechazo fiscal simulado.
   */
  beginManualAttempt(): Promise<VentaTicketBaiRecord | null> {
    if (this.record === null || this.record.estado !== 'rechazada') {
      return Promise.resolve(null);
    }

    this.record = {
      ...this.record,
      estado: 'enviando',
      intentos: this.record.intentos + 1,
      ultimoError: null,
      respuestaPayload: null,
      enviadoAt: '2026-08-29T18:00:00.000Z',
    };

    return Promise.resolve(this.record);
  }

  /**
   * Conserva la confirmación técnica simulada
   * de un reenvío TicketBAI.
   */
  markAttemptAcknowledged(
    command: MarkVentaTicketBaiAttemptAcknowledgedRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    if (this.record === null || this.record.estado !== 'enviando') {
      return Promise.reject(new Error('No existe un intento TicketBAI activo.'));
    }

    this.record = {
      ...this.record,
      respuestaPayload: command.respuestaPayload,
    };

    return Promise.resolve(this.record);
  }

  /**
   * Persiste un resultado remoto pendiente simulado.
   */
  markRemotePending(
    command: MarkVentaTicketBaiRemotePendingRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      return Promise.reject(new Error('No existe estado TicketBAI.'));
    }

    this.record = {
      ...this.record,
      estado: 'pendiente_remoto',
      huella: command.huella,
      qr: command.qr,
      url: command.url,
      respuestaPayload: command.respuestaPayload,
      ultimoError: null,
    };

    return Promise.resolve(this.record);
  }

  /**
   * Persiste un rechazo reconciliado simulado.
   */
  markReconciledRejected(
    command: MarkVentaTicketBaiReconciledRejectedRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    if (this.record === null) {
      return Promise.reject(new Error('No existe estado TicketBAI.'));
    }

    this.record = {
      ...this.record,
      estado: 'rechazada',
      huella: command.huella,
      qr: command.qr,
      url: command.url,
      ultimoError: command.ultimoError,
      respuestaPayload: command.respuestaPayload,
    };

    return Promise.resolve(this.record);
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
    ticketBai: null,
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
 * Construye un estado fiscal con identidad congelada
 * apto para las pruebas de reconciliación.
 */
function createReconcilableRecord(
  estado: VentaTicketBaiRecord['estado'] = 'pendiente_remoto',
): VentaTicketBaiRecord {
  return {
    ...createTicketBaiRecord(15, estado),
    entorno: 'test',
    nifEmisor: 'B87654321',
    serie: 'TPV01',
    numero: '000015',
    huella: estado === 'pendiente_remoto' ? 'HUELLA-INICIAL' : null,
    qr: estado === 'pendiente_remoto' ? 'QR-INICIAL' : null,
    url: estado === 'pendiente_remoto' ? 'https://example.test/tbai/inicial' : null,
    respuestaPayload: estado === 'pendiente_remoto' ? '{"result":"PENDING"}' : null,
  };
}

/**
 * Construye una factura rechazada apta
 * para iniciar un reintento manual.
 */
function createRejectedRecord(): VentaTicketBaiRecord {
  return {
    ...createReconcilableRecord('rechazada'),
    intentos: 1,
    ultimoError: 'TicketBAI ha rechazado la factura.',
    respuestaPayload: '{"result":"ERROR"}',
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
