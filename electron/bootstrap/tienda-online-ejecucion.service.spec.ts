import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import type {
  VentaTicketBaiEstado,
  VentaTicketBaiRecord,
} from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { describe, expect, it, vi } from 'vitest';
import { TiendaOnlineEjecucionService } from './tienda-online-ejecucion.service';

const TEST_URL: string = 'https://tienda.example.test';
const TEST_SECRET: string = 'a'.repeat(64);

/**
 * Construye una configuración operativa completa.
 */
function createAppData(overrides: Partial<AppData> = {}): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-11-13T08:00:00.000Z',

    nombre: 'Empresa',
    nombreComercial: 'Comercio',
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
      bodyTemplate: 'Contenido',
    },

    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [30],

    ventaOnline: true,
    urlApi: TEST_URL,

    tiendaOnlineSync: {
      fuenteId: 'tienda-pruebas',
      zonaHoraria: 'Europe/Madrid',
      metodosPago: {
        cards: 'visa',
      },
      politicaAck: 'solo-aceptada',
    },

    emailSmtp: null,
    ticketBai: null,
    backupAutomaticTime: '03:00',
    fechaCad: false,

    ...overrides,
  };
}

/**
 * Construye las credenciales protegidas de prueba.
 */
function createSecrets(): InstallationSecretsData {
  return {
    secretApi: TEST_SECRET,
    backupApiKey: 'backup-key-test',
    emailSmtpPass: null,
    ticketBaiToken: null,
  };
}

/**
 * Construye un artículo existente en el catálogo local.
 */
function createArticulo(): ArticuloVentaRecord {
  return {
    id: 1,
    publicId: 'articulo-123',
    localizador: 123,
    nombre: 'Artículo local',
    marca: 'Marca local',
    pucMicros: 4_000_000,
    pvpCents: 1_200,
    pvpDescuentoCents: null,
    ivaBps: 2_100,
    stock: 10,
    fechaCaducidad: null,
    observaciones: null,
    mostrarObservacionesVentas: false,
  };
}

/**
 * Construye el tipo de pago asociado
 * al método remoto de la tienda.
 */
function createTipoPago(): TipoPagoRecord {
  return {
    id: 1,
    publicId: 'tipo-pago-visa',
    nombre: 'Visa',
    slug: 'visa',
    fotoRelativePath: null,
    afectaCaja: false,
    orden: 1,
    fisico: true,
  };
}

/**
 * Construye un registro fiscal persistido.
 */
function createFiscalRecord(
  idVenta: number,
  estado: VentaTicketBaiEstado = 'aceptada',
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
    createdAt: '2026-11-13T10:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
  };
}

/**
 * Construye una respuesta válida del protocolo remoto.
 *
 * El pedido no tiene gastos de envío para no depender
 * de la ampliación del contrato prevista en A6.12.
 */
function createPendingResponse(): unknown {
  return {
    status: 'ok',
    version: 1,
    orders: [
      {
        id: 42,
        reference: 'ORDER-42',
        paidAt: '2026-11-13 10:30:00',
        paymentMethod: 'cards',
        productsTotalCents: 1_000,
        shippingCents: 0,
        shippingVatBps: null,
        totalCents: 1_000,
        items: [
          {
            productId: 57,
            sizeId: 0,
            colorId: 0,
            quantity: 1,
            name: 'Artículo web',
            brand: 'Marca web',
            localizador: '000123',
            ivaBps: 2_100,
            amountBeforeCents: 1_000,
            discountCents: 0,
            lineTotalCents: 1_000,
          },
        ],
      },
    ],
  };
}

/**
 * Construye la composición real de sincronización,
 * sustituyendo las fronteras externas por mocks.
 */
function createFixture() {
  const events: string[] = [];

  const appDataRepository = {
    load: vi.fn(async (): Promise<AppData | null> => createAppData()),
  };

  const secretStorage = {
    load: vi.fn(async (): Promise<InstallationSecretsData | null> => createSecrets()),
  };

  const applicationStateReader = {
    getState: vi.fn(async (): Promise<ApplicationStateResult> => ({
      state: 'ready',
      reason: 'ready',
    })),
  };

  const articulosRepository = {
    findByLocalizador: vi.fn(async (localizador: number): Promise<ArticuloVentaRecord | null> =>
      localizador === 123 ? createArticulo() : null,
    ),
  };

  const tiposPagoRepository = {
    findAll: vi.fn(async (): Promise<readonly TipoPagoRecord[]> => [createTipoPago()]),
  };

  const ventasRepository = {
    saveOnline: vi.fn(
      async (command: GuardarVentaOnlineRecordCommand): Promise<VentaPersistidaRecord> => {
        events.push('save');

        return {
          id: 1,
          publicId: command.publicId,
          serie: '',
          numero: 1,
          totalCents: command.totalCents,
          fecha: command.pagadaAt,
        };
      },
    ),
  };

  const fiscalService = {
    processInitial: vi.fn(async (idVenta: number): Promise<void> => {
      events.push(`fiscal:${idVenta}`);
    }),

    reconcile: vi.fn(async (idVenta: number): Promise<void> => {
      events.push(`reconcile:${idVenta}`);
    }),
  };

  const fiscalRepository = {
    findByVentaId: vi.fn(async (idVenta: number): Promise<VentaTicketBaiRecord | null> => {
      events.push(`fiscal-read:${idVenta}`);

      return createFiscalRecord(idVenta);
    }),
  };

  const fetchImplementation = vi.fn<typeof globalThis.fetch>(async (input): Promise<Response> => {
    const url: string = String(input);

    if (url.endsWith('/tpv/orders/pending')) {
      events.push('pending');

      return new Response(JSON.stringify(createPendingResponse()), {
        status: 200,
      });
    }

    if (url.endsWith('/tpv/orders/ack')) {
      events.push('ack');

      return new Response(
        JSON.stringify({
          status: 'ok',
          acknowledged: true,
        }),
        {
          status: 200,
        },
      );
    }

    throw new Error('URL de prueba inesperada.');
  });

  const service = new TiendaOnlineEjecucionService(
    {
      applicationStateReader,
      appDataRepository,
      secretStorage,
      articulosRepository,
      tiposPagoRepository,
      ventasRepository,
      fiscalRepository,
      fiscalService,
    },
    fetchImplementation,
  );

  return {
    service,
    events,
    applicationStateReader,
    appDataRepository,
    secretStorage,
    articulosRepository,
    tiposPagoRepository,
    ventasRepository,
    fiscalRepository,
    fiscalService,
    fetchImplementation,
  };
}

describe('TiendaOnlineEjecucionService', (): void => {
  it('omite una aplicación sin instalar', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(null);

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'not-installed',
      result: null,
    });

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('no conecta cuando la venta online está desactivada', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        ventaOnline: false,
      }),
    );

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'disabled',
      result: null,
    });

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
    expect(fixture.ventasRepository.saveOnline).not.toHaveBeenCalled();
  });

  it('omite una instalación antigua sin perfil operativo', async (): Promise<void> => {
    const fixture = createFixture();

    const { tiendaOnlineSync: omittedProfile, ...legacyAppData } = createAppData();

    void omittedProfile;

    fixture.appDataRepository.load.mockResolvedValue(legacyAppData);

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'not-configured',
      result: null,
    });

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('omite un perfil explícitamente desactivado', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        tiendaOnlineSync: null,
      }),
    );

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'not-configured',
      result: null,
    });

    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('rechaza un perfil operativo inválido', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        tiendaOnlineSync: {
          fuenteId: 'tienda-pruebas',
          zonaHoraria: 'Zona/Desconocida',
          metodosPago: { cards: 'visa' },
          politicaAck: 'solo-aceptada',
        },
      }),
    );

    await expect(fixture.service.execute()).rejects.toThrow(
      'El perfil de sincronización de tienda online no es válido.',
    );

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('no ejecuta la sincronización si la base de datos no está preparada', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.applicationStateReader.getState.mockResolvedValue({
      state: 'invalid',
      reason: 'database-invalid',
    });

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'not-ready',
      result: null,
    });

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
    expect(fixture.ventasRepository.saveOnline).not.toHaveBeenCalled();
  });

  it('rechaza una instalación sin credenciales', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.secretStorage.load.mockResolvedValue(null);

    await expect(fixture.service.execute()).rejects.toThrow(
      'No existe una credencial de sincronización configurada.',
    );

    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('rechaza una credencial con formato inválido', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.secretStorage.load.mockResolvedValue({
      ...createSecrets(),
      secretApi: 'credencial-invalida',
    });

    await expect(fixture.service.execute()).rejects.toThrow(
      'La credencial de sincronización no es válida.',
    );

    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('rechaza una URL insegura antes de conectar', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        urlApi: 'http://tienda.example.test',
      }),
    );

    await expect(fixture.service.execute()).rejects.toThrow(
      'La URL de sincronización debe ser HTTPS',
    );

    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('ejecuta el flujo completo desde HTTP hasta el ACK', async (): Promise<void> => {
    const fixture = createFixture();

    const execution = await fixture.service.execute();

    expect(execution.outcome).toBe('completed');

    expect(execution.result).toEqual({
      paginas: 1,
      cursorFinal: 42,
      limiteAlcanzado: false,
      pedidos: [
        {
          orderId: 42,
          reference: 'ORDER-42',
          ventaId: 1,
          estado: 'acknowledged',
          estadoFiscal: 'aceptada',
          error: null,
        },
      ],
    });

    expect(fixture.events).toEqual(['pending', 'save', 'fiscal:1', 'fiscal-read:1', 'ack']);

    expect(fixture.articulosRepository.findByLocalizador).toHaveBeenCalledExactlyOnceWith(123);

    expect(fixture.ventasRepository.saveOnline).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        publicId: expect.stringMatching(/^venta-online-[a-f0-9]{64}$/),
        referenciaExterna: expect.stringMatching(/^tienda-online-[a-f0-9]{64}$/),
        pagadaAt: '2026-11-13T09:30:00.000Z',
        totalCents: 1_000,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-visa',
            importeCents: 1_000,
            entregadoCents: null,
            cambioCents: 0,
          },
        ],
      }),
    );

    expect(fixture.fetchImplementation).toHaveBeenCalledTimes(2);

    expect(fixture.fetchImplementation).toHaveBeenNthCalledWith(
      1,
      `${TEST_URL}/tpv/orders/pending`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ afterId: 0 }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_SECRET}`,
        }),
      }),
    );

    expect(fixture.fetchImplementation).toHaveBeenNthCalledWith(
      2,
      `${TEST_URL}/tpv/orders/ack`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id: 42 }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${TEST_SECRET}`,
        }),
      }),
    );
  });

  it('respeta la política de ACK configurada', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.fiscalRepository.findByVentaId.mockResolvedValue(createFiscalRecord(1, 'no_aplica'));

    const first = await fixture.service.execute();

    expect(first.result?.pedidos[0]).toMatchObject({
      estado: 'fiscal-not-ready',
      estadoFiscal: 'no_aplica',
    });

    expect(fixture.fetchImplementation).toHaveBeenCalledTimes(1);

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        tiendaOnlineSync: {
          fuenteId: 'tienda-pruebas',
          zonaHoraria: 'Europe/Madrid',
          metodosPago: { cards: 'visa' },
          politicaAck: 'aceptada-o-no-aplica',
        },
      }),
    );

    const second = await fixture.service.execute();

    expect(second.result?.pedidos[0]).toMatchObject({
      estado: 'acknowledged',
      estadoFiscal: 'no_aplica',
    });

    expect(fixture.fetchImplementation).toHaveBeenCalledTimes(3);
  });

  it('recupera las credenciales en cada ejecución', async (): Promise<void> => {
    const fixture = createFixture();

    await fixture.service.execute();

    const newSecret: string = 'b'.repeat(64);

    fixture.secretStorage.load.mockResolvedValue({
      ...createSecrets(),
      secretApi: newSecret,
    });

    await fixture.service.execute();

    expect(fixture.appDataRepository.load).toHaveBeenCalledTimes(2);
    expect(fixture.secretStorage.load).toHaveBeenCalledTimes(2);

    expect(fixture.fetchImplementation).toHaveBeenNthCalledWith(
      3,
      `${TEST_URL}/tpv/orders/pending`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${newSecret}`,
        }),
      }),
    );
  });

  it('impide dos ejecuciones simultáneas', async (): Promise<void> => {
    const fixture = createFixture();

    const firstExecution = fixture.service.execute();

    await expect(fixture.service.execute()).resolves.toEqual({
      outcome: 'busy',
      result: null,
    });

    await expect(firstExecution).resolves.toMatchObject({
      outcome: 'completed',
    });

    expect(fixture.appDataRepository.load).toHaveBeenCalledTimes(1);
    expect(fixture.ventasRepository.saveOnline).toHaveBeenCalledTimes(1);
  });

  it('libera el bloqueo tras un error de comunicación', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.fetchImplementation.mockRejectedValueOnce(new Error('Conexión no disponible.'));

    await expect(fixture.service.execute()).rejects.toThrow(
      'No se ha podido establecer la comunicación con la tienda online.',
    );

    expect(fixture.ventasRepository.saveOnline).not.toHaveBeenCalled();

    await expect(fixture.service.execute()).resolves.toMatchObject({
      outcome: 'completed',
    });

    expect(fixture.ventasRepository.saveOnline).toHaveBeenCalledTimes(1);
  });

  it('puede recuperar una confirmación remota fallida', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.fetchImplementation
      .mockResolvedValueOnce(new Response(JSON.stringify(createPendingResponse()), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));

    const first = await fixture.service.execute();

    expect(first.result?.pedidos[0]).toMatchObject({
      estado: 'ack-error',
      ventaId: 1,
    });

    const second = await fixture.service.execute();

    expect(second.result?.pedidos[0]).toMatchObject({
      estado: 'acknowledged',
      ventaId: 1,
    });

    const firstCommand = fixture.ventasRepository.saveOnline.mock.calls[0]?.[0];

    const secondCommand = fixture.ventasRepository.saveOnline.mock.calls[1]?.[0];

    expect(firstCommand).toBeDefined();
    expect(secondCommand).toEqual(firstCommand);
  });

  it('no confirma pedidos con artículos desconocidos', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.articulosRepository.findByLocalizador.mockResolvedValue(null);

    const execution = await fixture.service.execute();

    expect(execution.result?.pedidos[0]).toMatchObject({
      estado: 'blocked',
      ventaId: null,
    });

    expect(fixture.ventasRepository.saveOnline).not.toHaveBeenCalled();
    expect(fixture.fiscalService.processInitial).not.toHaveBeenCalled();

    expect(fixture.fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('admite una ejecución manual con la URL esperada', async (): Promise<void> => {
    const fixture = createFixture();

    await expect(fixture.service.execute(TEST_URL)).resolves.toMatchObject({
      outcome: 'completed',
    });
  });

  it('impide una prueba manual contra una URL diferente', async (): Promise<void> => {
    const fixture = createFixture();

    await expect(fixture.service.execute('https://otra-tienda.example.test')).rejects.toThrow(
      'La URL configurada no coincide con la tienda online de pruebas.',
    );

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });

  it('impide una prueba manual con TicketBAI de producción', async (): Promise<void> => {
    const fixture = createFixture();

    fixture.appDataRepository.load.mockResolvedValue(
      createAppData({
        ticketBai: {
          nif: 'B12345678',
          environment: 'production',
        },
      }),
    );

    await expect(fixture.service.execute(TEST_URL)).rejects.toThrow(
      'La sincronización manual de pruebas no admite TicketBAI de producción.',
    );

    expect(fixture.secretStorage.load).not.toHaveBeenCalled();
    expect(fixture.fetchImplementation).not.toHaveBeenCalled();
  });
});
