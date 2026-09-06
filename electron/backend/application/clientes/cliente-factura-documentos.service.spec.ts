import ClienteFacturaDocumentosService from '@backend/application/clientes/cliente-factura-documentos.service';
import ConfigurationService from '@backend/application/configuration/configuration.service';
import type ClienteFacturaDocumentosRepository from '@backend/contracts/clientes/cliente-factura-documentos.repository.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type { ClienteFacturaDocumentoRecord } from '@backend/domain/clientes/cliente-factura-documento-record.interface';
import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteFacturaDocumentosRepository implements ClienteFacturaDocumentosRepository {
  record: ClienteFacturaDocumentoRecord | null = createDocumentoRecord();
  requestedClientePublicId: string | null = null;
  requestedFacturaPublicId: string | null = null;

  /**
   * Registra la consulta y devuelve el snapshot
   * documental preparado para la prueba.
   */
  findDocumentoByPublicId(
    clientePublicId: string,
    facturaPublicId: string,
  ): Promise<ClienteFacturaDocumentoRecord | null> {
    this.requestedClientePublicId = clientePublicId;
    this.requestedFacturaPublicId = facturaPublicId;

    return Promise.resolve(this.record);
  }
}

class FakeAppDataRepository implements AppDataRepository {
  data: AppData | null = createAppData();

  /**
   * Indica si existe configuración simulada.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.data !== null);
  }

  /**
   * Devuelve la configuración preparada para la prueba.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(this.data);
  }

  /**
   * Sustituye la configuración simulada.
   */
  save(appData: AppData): Promise<void> {
    this.data = appData;

    return Promise.resolve();
  }

  /**
   * Elimina la configuración simulada.
   */
  delete(): Promise<void> {
    this.data = null;

    return Promise.resolve();
  }
}

describe('ClienteFacturaDocumentosService', (): void => {
  it('construye un documento emitido con emisor, snapshot, ventas e impuestos', async (): Promise<void> => {
    const repository = new FakeClienteFacturaDocumentosRepository();
    const appDataRepository = new FakeAppDataRepository();
    const service = createService(repository, appDataRepository);

    const result: ClienteFacturaDocumentoInterface = await service.getDocumento({
      clientePublicId: '  cliente-1  ',
      facturaPublicId: '  factura-1  ',
    });

    expect(repository.requestedClientePublicId).toBe('cliente-1');
    expect(repository.requestedFacturaPublicId).toBe('factura-1');

    expect(result.facturaPublicId).toBe('factura-1');
    expect(result.numero).toBe(21);
    expect(result.year).toBe(2026);
    expect(result.numeroFactura).toBe('21_2026');
    expect(result.estado).toBe('emitida');
    expect(result.previsualizacion).toBe(false);
    expect(result.fechaDocumento).toBe('2026-09-06T10:00:00.000Z');

    expect(result.emisor.nombre).toBe('Empresa fiscal');
    expect(result.emisor.nombreComercial).toBe('Mi tienda');

    expect(result.cliente.nombreApellidos).toBe('Cliente histórico');
    expect(result.cliente.dniCif).toBe('12345678Z');
    expect(result.cliente.provinciaId).toBe(48);

    expect(result.impuestos).toEqual([
      {
        ivaBps: 1000,
        baseCents: 1_000,
        cuotaCents: 100,
        totalCents: 1_100,
      },
      {
        ivaBps: 2100,
        baseCents: 1_000,
        cuotaCents: 210,
        totalCents: 1_210,
      },
    ]);

    expect(result.totalCents).toBe(2_310);
  });

  it('construye un borrador como previsualización sin numeración definitiva', async (): Promise<void> => {
    const repository = new FakeClienteFacturaDocumentosRepository();
    const appDataRepository = new FakeAppDataRepository();

    repository.record = {
      ...createDocumentoRecord(),
      numero: null,
      estado: 'borrador',
      fechaEmision: null,
    };

    const service = createService(repository, appDataRepository);
    const result: ClienteFacturaDocumentoInterface = await service.getDocumento({
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    });

    expect(result.previsualizacion).toBe(true);
    expect(result.numero).toBeNull();
    expect(result.year).toBeNull();
    expect(result.numeroFactura).toBeNull();
    expect(result.fechaDocumento).toBe(result.generatedAt);
  });

  it('rechaza un documento cuyo total no coincide con las ventas', async (): Promise<void> => {
    const repository = new FakeClienteFacturaDocumentosRepository();
    const appDataRepository = new FakeAppDataRepository();

    repository.record = {
      ...createDocumentoRecord(),
      importeCents: 9_999,
    };

    const service = createService(repository, appDataRepository);

    await expect(
      service.getDocumento({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toThrow('El total de la factura no coincide con sus ventas.');
  });

  it('rechaza facturas o configuración inexistentes', async (): Promise<void> => {
    const repository = new FakeClienteFacturaDocumentosRepository();
    const appDataRepository = new FakeAppDataRepository();
    const service = createService(repository, appDataRepository);

    repository.record = null;

    await expect(
      service.getDocumento({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-inexistente',
      }),
    ).rejects.toThrow('La factura indicada no existe o ya no está disponible.');

    repository.record = createDocumentoRecord();
    appDataRepository.data = null;

    await expect(
      service.getDocumento({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toThrow('La configuración de la aplicación no está disponible.');
  });
});

/**
 * Construye el servicio con dependencias controladas
 * por cada prueba.
 */
function createService(
  repository: ClienteFacturaDocumentosRepository,
  appDataRepository: AppDataRepository,
): ClienteFacturaDocumentosService {
  return new ClienteFacturaDocumentosService(
    new ConfigurationService(appDataRepository),
    repository,
  );
}

/**
 * Crea un snapshot documental coherente con dos
 * ventas y dos tipos de IVA.
 */
function createDocumentoRecord(): ClienteFacturaDocumentoRecord {
  return {
    publicId: 'factura-1',
    serie: '',
    numero: 21,
    estado: 'emitida',
    importeCents: 2_310,
    fechaCreacion: '2026-09-05T10:00:00.000Z',
    fechaEmision: '2026-09-06T10:00:00.000Z',
    fechaAnulacion: null,
    cliente: {
      nombreApellidos: 'Cliente histórico',
      dniCif: '12345678Z',
      telefono: '600000000',
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
        fecha: '2026-09-04T10:00:00.000Z',
        totalCents: 1_210,
        lineas: [
          {
            localizador: 1001,
            marca: 'Marca A',
            nombre: 'Artículo 21',
            pvpMicros: 12_100_000,
            ivaBps: 2100,
            importeMicros: 12_100_000,
            descuentoBps: 0,
            importeDescuentoMicros: 0,
            unidades: 1,
            regalo: false,
          },
        ],
      },
      {
        publicId: 'venta-2',
        serie: '',
        numero: 102,
        fecha: '2026-09-05T10:00:00.000Z',
        totalCents: 1_100,
        lineas: [
          {
            localizador: 1002,
            marca: 'Marca B',
            nombre: 'Artículo 10',
            pvpMicros: 11_000_000,
            ivaBps: 1000,
            importeMicros: 11_000_000,
            descuentoBps: 0,
            importeDescuentoMicros: 0,
            unidades: 1,
            regalo: false,
          },
        ],
      },
    ],
  };
}

/**
 * Crea la configuración necesaria para construir
 * el encabezado documental de la factura.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-01-01T10:00:00.000Z',
    nombre: 'Empresa fiscal',
    nombreComercial: 'Mi tienda',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',

    twitter: '',
    facebook: '',
    instagram: '',
    web: 'https://example.com',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Adjuntamos su ticket.',
    },
    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [],

    ventaOnline: false,
    urlApi: '',

    emailSmtp: null,
    ticketBai: null,

    fechaCad: false,
    empleados: true,
  };
}
