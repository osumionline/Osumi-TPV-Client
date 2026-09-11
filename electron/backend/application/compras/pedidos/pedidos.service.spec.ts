import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import type { PedidoSaveCommand } from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type {
  PedidoListadoConsulta,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import { describe, expect, it } from 'vitest';
import PedidosService from './pedidos.service';

class FakePedidosRepository implements PedidosRepository {
  lastGuardadosQuery: PedidoRepositoryQuery | null = null;
  lastRecepcionadosQuery: PedidoRepositoryQuery | null = null;
  lastGetPedidoId: number | null = null;
  lastSavedCommand: PedidoSaveRecord | null = null;
  lastDeletedPedidoId: number | null = null;

  pedidoResult: PedidoCabeceraRecord | null = {
    id: 9,
    publicId: 'order-9',
    idProveedor: 4,
    proveedorNombre: 'Proveedor',
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    tipo: 'factura',
    numero: 'ORD-9',
    fechaPedido: '2026-09-10',
    fechaPago: '2026-09-11',
    fechaRecepcionado: null,
    recargoEquivalencia: true,
    europeo: false,
    recepcionado: false,
    observaciones: 'Pedido de prueba',
    columnasVisibles: [1, 4],
  };

  /**
   * Conserva la consulta de pendientes recibida.
   */
  searchPedidosGuardados(query: PedidoRepositoryQuery): Promise<PedidosGuardadosResultadoRecord> {
    this.lastGuardadosQuery = query;

    return Promise.resolve({
      rows: [
        {
          id: 1,
          publicId: 'order-1',
          fechaPedido: '2026-09-10',
          idProveedor: 4,
          proveedorNombre: 'Proveedor',
          tipo: 'factura',
          numero: 'ORD-1',
          importeMicros: 28_670_000,
          observaciones: 'Nota',
        },
      ],
      totalRows: 1,
    });
  }

  /**
   * Conserva la consulta de recepcionados recibida.
   */
  searchPedidosRecepcionados(
    query: PedidoRepositoryQuery,
  ): Promise<PedidosRecepcionadosResultadoRecord> {
    this.lastRecepcionadosQuery = query;

    return Promise.resolve({
      rows: [
        {
          id: 2,
          publicId: 'order-2',
          fechaPedido: '2026-05-26',
          fechaRecepcionado: '2026-05-29',
          fechaPago: '2026-05-29',
          idProveedor: 5,
          proveedorNombre: 'Proveedor UE',
          tipo: 'factura',
          numero: '#000051640',
          importeMicros: 603_990_000,
          observaciones: null,
          europeo: true,
        },
      ],
      totalRows: 1,
    });
  }

  /**
   * Devuelve opciones representativas de proveedor.
   */
  getPedidoFilterOptions(): Promise<PedidoFilterOptionsRecord> {
    return Promise.resolve({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
    });
  }

  /**
   * Devuelve el pedido configurado para el test.
   */
  getPedido(idPedido: number): Promise<PedidoCabeceraRecord | null> {
    this.lastGetPedidoId = idPedido;

    return Promise.resolve(this.pedidoResult);
  }

  /**
   * Devuelve opciones representativas para editar la ficha.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsRecord> {
    return Promise.resolve({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
      tiposPago: [
        {
          idTipoPago: 7,
          nombre: 'Tarjeta',
        },
      ],
    });
  }

  /**
   * Conserva la cabecera recibida y devuelve un identificador simulado.
   */
  savePedido(command: PedidoSaveRecord): Promise<number> {
    this.lastSavedCommand = command;

    return Promise.resolve(77);
  }

  /**
   * Conserva el identificador del pedido solicitado para eliminación.
   */
  deletePedido(idPedido: number): Promise<void> {
    this.lastDeletedPedidoId = idPedido;

    return Promise.resolve();
  }
}

/**
 * Construye una consulta representativa de los listados.
 */
function createConsulta(overrides: Partial<PedidoListadoConsulta> = {}): PedidoListadoConsulta {
  return {
    fechaDesde: null,
    fechaHasta: null,
    idProveedor: null,
    numero: '',
    importeDesdeMicros: null,
    importeHastaMicros: null,
    pagina: 1,
    num: 20,
    ...overrides,
  };
}

/**
 * Construye un comando válido de guardado de Pedido.
 */
function createSaveCommand(overrides: Partial<PedidoSaveCommand> = {}): PedidoSaveCommand {
  return {
    id: null,
    idProveedor: 4,
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    tipo: 'factura',
    numero: 'ORD-77',
    fechaPedido: '2026-09-10',
    fechaPago: null,
    recargoEquivalencia: true,
    europeo: false,
    observaciones: 'Pedido de prueba',
    columnasVisibles: [1, 4],
    ...overrides,
  };
}

describe('PedidosService', (): void => {
  it('normaliza filtros y paginación de pedidos pendientes', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result: PedidosGuardadosResultado = await service.searchPedidosGuardados(
      createConsulta({
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-12-31',
        idProveedor: 4,
        numero: '  ORD  ',
        importeDesdeMicros: 10_000_000,
        importeHastaMicros: 50_000_000,
        pagina: 2,
        num: 20,
      }),
    );

    expect(repository.lastGuardadosQuery).toEqual({
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      idProveedor: 4,
      numero: 'ORD',
      importeDesdeMicros: 10_000_000,
      importeHastaMicros: 50_000_000,
      offset: 20,
      limit: 20,
    });
    expect(result.rows[0]?.numero).toBe('ORD-1');
  });

  it('delega independientemente el listado de recepcionados', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result: PedidosRecepcionadosResultado =
      await service.searchPedidosRecepcionados(createConsulta());

    expect(repository.lastGuardadosQuery).toBeNull();
    expect(repository.lastRecepcionadosQuery).not.toBeNull();
    expect(result.rows[0]).toMatchObject({
      id: 2,
      europeo: true,
      fechaRecepcionado: '2026-05-29',
    });
  });

  it('rechaza rangos de fecha e importe invertidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          fechaDesde: '2026-09-10',
          fechaHasta: '2026-09-01',
        }),
      ),
    ).rejects.toThrow('La fecha inicial no puede ser posterior');

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          importeDesdeMicros: 20_000_000,
          importeHastaMicros: 10_000_000,
        }),
      ),
    ).rejects.toThrow('El importe mínimo no puede ser superior');
  });

  it('rechaza fechas civiles imposibles y tamaños de página ajenos al catálogo', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          fechaDesde: '2026-02-30',
        }),
      ),
    ).rejects.toThrow('La fecha inicial');

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          num: 10,
        }),
      ),
    ).rejects.toThrow('El tamaño de página');
  });

  it('expone las opciones de proveedor de los filtros', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    const result = await service.getPedidoFilterOptions();

    expect(result).toEqual({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
    });
  });

  it('recupera y mapea la cabecera de un pedido', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result = await service.getPedido(9);

    expect(repository.lastGetPedidoId).toBe(9);
    expect(result).toEqual({
      id: 9,
      publicId: 'order-9',
      idProveedor: 4,
      proveedorNombre: 'Proveedor',
      idTipoPago: null,
      formaPago: 'Domiciliación bancaria',
      tipo: 'factura',
      numero: 'ORD-9',
      fechaPedido: '2026-09-10',
      fechaPago: '2026-09-11',
      fechaRecepcionado: null,
      recargoEquivalencia: true,
      europeo: false,
      recepcionado: false,
      observaciones: 'Pedido de prueba',
      columnasVisibles: [1, 4],
    });
  });

  it('devuelve null cuando el pedido no existe', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    repository.pedidoResult = null;

    const service = new PedidosService(repository);

    await expect(service.getPedido(9)).resolves.toBeNull();
    expect(repository.lastGetPedidoId).toBe(9);
  });

  it('rechaza identificadores de pedido inválidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(service.getPedido(0)).rejects.toThrow('El identificador del pedido no es válido.');
    await expect(service.deletePedido(-1)).rejects.toThrow(
      'El identificador del pedido no es válido.',
    );
  });

  it('expone las opciones disponibles para editar la ficha', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    const result = await service.getPedidoFormOptions();

    expect(result).toEqual({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
      tiposPago: [
        {
          idTipoPago: 7,
          nombre: 'Tarjeta',
        },
      ],
    });
  });

  it('normaliza la cabecera antes de guardarla', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const idPedido: number = await service.savePedido(
      createSaveCommand({
        formaPago: '  Domiciliación bancaria  ',
        numero: '  ORD-100  ',
        observaciones: '  Observación  ',
        columnasVisibles: [1, 4, 1],
      }),
    );

    expect(idPedido).toBe(77);
    expect(repository.lastSavedCommand).toEqual({
      id: null,
      idProveedor: 4,
      idTipoPago: null,
      formaPago: 'Domiciliación bancaria',
      tipo: 'factura',
      numero: 'ORD-100',
      fechaPedido: '2026-09-10',
      fechaPago: null,
      recargoEquivalencia: true,
      europeo: false,
      observaciones: 'Observación',
      columnasVisibles: [1, 4],
    });
  });

  it('rechaza un guardado sin proveedor válido', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          idProveedor: 0,
        }),
      ),
    ).rejects.toThrow('Debes seleccionar un proveedor.');
  });

  it('rechaza fechas imposibles en la cabecera', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          fechaPedido: '2026-02-30',
        }),
      ),
    ).rejects.toThrow('Una de las fechas del pedido no es válida.');
  });

  it('rechaza tipos documentales desconocidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());
    const command: PedidoSaveCommand = {
      ...createSaveCommand(),
      tipo: 'desconocido',
    } as unknown as PedidoSaveCommand;

    await expect(service.savePedido(command)).rejects.toThrow(
      'El tipo documental del pedido no es válido.',
    );
  });

  it('rechaza identificadores de columnas que no pertenecen al catálogo opcional', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          columnasVisibles: [1, 999],
        }),
      ),
    ).rejects.toThrow('La configuración de columnas del pedido no es válida.');
  });

  it('delega la eliminación de un pedido válido', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    await service.deletePedido(9);

    expect(repository.lastDeletedPedidoId).toBe(9);
  });
});
