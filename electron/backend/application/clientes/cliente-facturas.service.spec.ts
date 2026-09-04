import ClienteFacturasService from '@backend/application/clientes/cliente-facturas.service';
import type ClienteFacturasRepository from '@backend/contracts/clientes/cliente-facturas.repository.interface';
import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import type { ClienteFacturaVentaDisponibleRecord } from '@backend/domain/clientes/cliente-factura-venta-record.interface';
import type { ClienteFacturaVentaDisponibleInterface } from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteFacturasRepository implements ClienteFacturasRepository {
  records: readonly ClienteFacturaRecord[] = [];
  ventasDisponibles: readonly ClienteFacturaVentaDisponibleRecord[] = [];

  requestedPublicId: string | null = null;
  requestedVentasClientePublicId: string | null = null;
  requestedBorradorPublicId: string | null = null;

  /**
   * Registra el cliente solicitado y devuelve las
   * facturas preparadas para cada prueba.
   */
  findByClientePublicId(publicId: string): Promise<readonly ClienteFacturaRecord[]> {
    this.requestedPublicId = publicId;

    return Promise.resolve(this.records);
  }

  /**
   * Registra la consulta y devuelve las ventas
   * disponibles preparadas para cada prueba.
   */
  findVentasDisponibles(
    clientePublicId: string,
    borradorPublicId: string | null,
  ): Promise<readonly ClienteFacturaVentaDisponibleRecord[]> {
    this.requestedVentasClientePublicId = clientePublicId;
    this.requestedBorradorPublicId = borradorPublicId;

    return Promise.resolve(this.ventasDisponibles);
  }
}

describe('ClienteFacturasService', (): void => {
  it('normaliza el cliente y construye el modelo público de todos los estados', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.records = [
      createRecord({
        publicId: 'factura-borrador',
        estado: 'borrador',
        numero: null,
        year: null,
        importeCents: 5_000,
        fechaCreacion: '2026-09-04T10:00:00.000Z',
        fechaEmision: null,
        fechaAnulacion: null,
      }),
      createRecord({
        publicId: 'factura-emitida',
        estado: 'emitida',
        numero: 7,
        year: 2026,
        importeCents: 12_345,
        fechaCreacion: '2026-08-19T10:00:00.000Z',
        fechaEmision: '2026-08-20T09:00:00.000Z',
        fechaAnulacion: null,
      }),
      createRecord({
        publicId: 'factura-anulada',
        estado: 'anulada',
        numero: 6,
        year: 2026,
        importeCents: 8_750,
        fechaCreacion: '2026-07-14T10:00:00.000Z',
        fechaEmision: '2026-07-15T09:00:00.000Z',
        fechaAnulacion: '2026-09-03T12:00:00.000Z',
      }),
    ];

    const service = new ClienteFacturasService(repository);

    const result: readonly ClienteFacturaInterface[] =
      await service.getByClientePublicId('  cliente-1  ');

    expect(repository.requestedPublicId).toBe('cliente-1');

    expect(result).toEqual([
      {
        publicId: 'factura-borrador',
        serie: '',
        numero: null,
        year: null,
        numeroFactura: null,
        estado: 'borrador',
        fecha: '2026-09-04T10:00:00.000Z',
        fechaCreacion: '2026-09-04T10:00:00.000Z',
        fechaEmision: null,
        fechaAnulacion: null,
        importeCents: 5_000,
        capacidades: {
          puedeEditar: true,
          puedeEliminar: true,
          puedePrevisualizar: true,
          puedeFacturar: true,
          puedeImprimir: false,
          puedeEnviarEmail: false,
          puedeAnular: false,
        },
      },
      {
        publicId: 'factura-emitida',
        serie: '',
        numero: 7,
        year: 2026,
        numeroFactura: '7_2026',
        estado: 'emitida',
        fecha: '2026-08-20T09:00:00.000Z',
        fechaCreacion: '2026-08-19T10:00:00.000Z',
        fechaEmision: '2026-08-20T09:00:00.000Z',
        fechaAnulacion: null,
        importeCents: 12_345,
        capacidades: {
          puedeEditar: false,
          puedeEliminar: false,
          puedePrevisualizar: false,
          puedeFacturar: false,
          puedeImprimir: true,
          puedeEnviarEmail: true,
          puedeAnular: true,
        },
      },
      {
        publicId: 'factura-anulada',
        serie: '',
        numero: 6,
        year: 2026,
        numeroFactura: '6_2026',
        estado: 'anulada',
        fecha: '2026-07-15T09:00:00.000Z',
        fechaCreacion: '2026-07-14T10:00:00.000Z',
        fechaEmision: '2026-07-15T09:00:00.000Z',
        fechaAnulacion: '2026-09-03T12:00:00.000Z',
        importeCents: 8_750,
        capacidades: {
          puedeEditar: false,
          puedeEliminar: false,
          puedePrevisualizar: false,
          puedeFacturar: false,
          puedeImprimir: false,
          puedeEnviarEmail: false,
          puedeAnular: false,
        },
      },
    ]);
  });

  it('normaliza la consulta y construye las ventas disponibles para una factura nueva', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.ventasDisponibles = [
      createVentaRecord({
        pagos: [
          {
            tipoPagoPublicId: 'efectivo',
            nombre: 'Efectivo',
            importeCents: 750,
          },
          {
            tipoPagoPublicId: 'tarjeta',
            nombre: 'Tarjeta',
            importeCents: 500,
          },
        ],
      }),
    ];

    const service = new ClienteFacturasService(repository);

    const result: readonly ClienteFacturaVentaDisponibleInterface[] =
      await service.getVentasDisponibles({
        clientePublicId: '  cliente-1  ',
        borradorPublicId: null,
      });

    expect(repository.requestedVentasClientePublicId).toBe('cliente-1');
    expect(repository.requestedBorradorPublicId).toBeNull();
    expect(result).toEqual([
      {
        id: 41,
        publicId: 'venta-41',
        serie: '',
        numero: 412,
        fecha: '2026-08-31T10:30:00.000Z',
        totalCents: 1_250,
        incluidaEnBorrador: false,
        pagos: [
          {
            tipoPagoPublicId: 'efectivo',
            nombre: 'Efectivo',
            importeCents: 750,
          },
          {
            tipoPagoPublicId: 'tarjeta',
            nombre: 'Tarjeta',
            importeCents: 500,
          },
        ],
      },
    ]);
  });

  it('incluye las ventas pertenecientes al propio borrador', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.records = [
      createRecord({
        publicId: 'factura-borrador',
      }),
    ];
    repository.ventasDisponibles = [
      createVentaRecord({
        incluidaEnBorrador: true,
      }),
    ];

    const service = new ClienteFacturasService(repository);

    const result: readonly ClienteFacturaVentaDisponibleInterface[] =
      await service.getVentasDisponibles({
        clientePublicId: '  cliente-1  ',
        borradorPublicId: '  factura-borrador  ',
      });

    expect(repository.requestedPublicId).toBe('cliente-1');
    expect(repository.requestedVentasClientePublicId).toBe('cliente-1');
    expect(repository.requestedBorradorPublicId).toBe('factura-borrador');
    expect(result[0]?.incluidaEnBorrador).toBe(true);
  });

  it('rechaza identificadores no válidos antes de consultar las ventas', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();
    const service = new ClienteFacturasService(repository);

    await expect(
      service.getVentasDisponibles({
        clientePublicId: '   ',
        borradorPublicId: null,
      }),
    ).rejects.toThrow('El identificador del cliente no es válido.');

    await expect(
      service.getVentasDisponibles({
        clientePublicId: 'cliente-1',
        borradorPublicId: '   ',
      }),
    ).rejects.toThrow('El identificador del borrador de factura no es válido.');

    expect(repository.requestedVentasClientePublicId).toBeNull();
  });

  it('rechaza una factura que ya no es un borrador editable', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.records = [
      createRecord({
        publicId: 'factura-emitida',
        estado: 'emitida',
      }),
    ];

    const service = new ClienteFacturasService(repository);

    await expect(
      service.getVentasDisponibles({
        clientePublicId: 'cliente-1',
        borradorPublicId: 'factura-emitida',
      }),
    ).rejects.toThrow('El borrador de factura no pertenece al cliente o ya no está disponible.');

    expect(repository.requestedVentasClientePublicId).toBeNull();
  });

  it('rechaza un identificador de cliente vacío antes de consultar el repository', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();
    const service = new ClienteFacturasService(repository);

    await expect(service.getByClientePublicId('   ')).rejects.toThrow(
      'El identificador del cliente no es válido.',
    );

    expect(repository.requestedPublicId).toBeNull();
  });

  it('rechaza una factura finalizada sin numeración oficial', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.records = [
      createRecord({
        estado: 'emitida',
        numero: null,
        year: null,
        fechaEmision: null,
      }),
    ];

    const service = new ClienteFacturasService(repository);

    await expect(service.getByClientePublicId('cliente-1')).rejects.toThrow(
      'La factura no tiene una numeración o fecha de emisión válidas.',
    );
  });

  it('rechaza una factura anulada sin fecha de anulación', async (): Promise<void> => {
    const repository = new FakeClienteFacturasRepository();

    repository.records = [
      createRecord({
        estado: 'anulada',
        numero: 8,
        year: 2026,
        fechaEmision: '2026-09-01T10:00:00.000Z',
        fechaAnulacion: null,
      }),
    ];

    const service = new ClienteFacturasService(repository);

    await expect(service.getByClientePublicId('cliente-1')).rejects.toThrow(
      'La factura anulada no tiene fecha de anulación.',
    );
  });
});

/**
 * Crea un registro de factura válido y permite
 * sobrescribir los datos relevantes para cada prueba.
 */
function createRecord(overrides: Partial<ClienteFacturaRecord> = {}): ClienteFacturaRecord {
  return {
    publicId: 'factura-1',
    serie: '',
    numero: null,
    year: null,
    estado: 'borrador',
    importeCents: 1_000,
    fechaCreacion: '2026-09-04T09:00:00.000Z',
    fechaEmision: null,
    fechaAnulacion: null,
    ...overrides,
  };
}

/**
 * Crea una venta disponible válida y permite
 * sobrescribir los datos relevantes para cada prueba.
 */
function createVentaRecord(
  overrides: Partial<ClienteFacturaVentaDisponibleRecord> = {},
): ClienteFacturaVentaDisponibleRecord {
  return {
    id: 41,
    publicId: 'venta-41',
    serie: '',
    numero: 412,
    fecha: '2026-08-31T10:30:00.000Z',
    totalCents: 1_250,
    incluidaEnBorrador: false,
    pagos: [
      {
        tipoPagoPublicId: 'efectivo',
        nombre: 'Efectivo',
        importeCents: 1_250,
      },
    ],
    ...overrides,
  };
}
