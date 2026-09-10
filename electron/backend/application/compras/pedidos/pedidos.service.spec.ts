import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
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
}

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

  it('expone las opciones de proveedor sin compartir estructuras del repository', async (): Promise<void> => {
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
});
