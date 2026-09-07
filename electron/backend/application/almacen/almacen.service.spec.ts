import AlmacenService from '@backend/application/almacen/almacen.service';
import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';
import { describe, expect, it } from 'vitest';

class FakeAlmacenRepository implements AlmacenRepository {
  lastQuery: InventarioRepositoryQuery | null = null;
  lastSavedCommands: readonly InventarioSaveRecord[] | null = null;
  lastDeactivatedArticuloId: number | null = null;

  result: InventarioResultadoRecord = {
    rows: [
      {
        id: 25,
        publicId: 'article-public-id',
        localizador: 261234,
        idProveedor: 4,
        proveedorNombre: 'Proveedor de prueba',
        idMarca: 3,
        marcaNombre: 'Marca de prueba',
        referencia: 'REF-25',
        idsCategorias: [2, 7],
        nombre: 'Artículo de prueba',
        stock: 8,
        precioAlbaranMicros: 590_000,
        pucMicros: 744_580,
        pvpCents: 100,
        margenMicroporcentaje: 255_420,
        ivaBps: 2100,
        reBps: 520,
        tieneCodigoAdicional: true,
        sinVentasUltimos12Meses: false,
      },
    ],
    totalRows: 1,
    mediaMargenMicroporcentaje: 255_420,
    totalPucMicros: 5_956_640,
    totalPvpCents: 800,
  };

  /**
   * Devuelve el resultado configurado y conserva la consulta recibida.
   */
  searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord> {
    this.lastQuery = query;

    return Promise.resolve(this.result);
  }

  /**
   * Conserva las filas recibidas para los tests de persistencia.
   */
  saveInventarioRows(commands: readonly InventarioSaveRecord[]): Promise<void> {
    this.lastSavedCommands = commands;

    return Promise.resolve();
  }

  /**
   * Conserva el artículo recibido para los tests de baja.
   */
  deactivateArticulo(idArticulo: number): Promise<void> {
    this.lastDeactivatedArticuloId = idArticulo;

    return Promise.resolve();
  }
}

describe('AlmacenService', (): void => {
  it('normaliza filtros y paginación antes de consultar el repository', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const result: InventarioResultado = await service.searchInventario({
      idProveedor: 4,
      idMarca: 3,
      idCategoria: 7,
      texto: '  camiseta azul  ',
      conDescuento: true,
      pagina: 3,
      num: 50,
    });

    expect(repository.lastQuery).toEqual({
      idProveedor: 4,
      idMarca: 3,
      idCategoria: 7,
      texto: 'camiseta azul',
      conDescuento: true,
      ventasDesde: '2025-09-07T08:00:00.000Z',
      offset: 100,
      limit: 50,
    });

    expect(result).toEqual({
      rows: [
        {
          id: 25,
          publicId: 'article-public-id',
          localizador: 261234,
          idProveedor: 4,
          proveedorNombre: 'Proveedor de prueba',
          idMarca: 3,
          marcaNombre: 'Marca de prueba',
          referencia: 'REF-25',
          idsCategorias: [2, 7],
          nombre: 'Artículo de prueba',
          stock: 8,
          precioAlbaranMicros: 590_000,
          pucMicros: 744_580,
          pvpCents: 100,
          margenMicroporcentaje: 255_420,
          ivaBps: 2100,
          reBps: 520,
          tieneCodigoAdicional: true,
          sinVentasUltimos12Meses: false,
        },
      ],
      totalRows: 1,
      mediaMargenMicroporcentaje: 255_420,
      totalPucMicros: 5_956_640,
      totalPvpCents: 800,
    });
  });

  it('convierte una búsqueda vacía en ausencia de filtro textual', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await service.searchInventario(
      createConsulta({
        texto: '   ',
      }),
    );

    expect(repository.lastQuery?.texto).toBeNull();
  });

  it('rechaza identificadores de filtro inválidos', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(
      service.searchInventario(
        createConsulta({
          idCategoria: 0,
        }),
      ),
    ).rejects.toThrow('La categoría del filtro no es válida.');

    expect(repository.lastQuery).toBeNull();
  });

  it('rechaza tamaños de página no soportados', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(
      service.searchInventario(
        createConsulta({
          num: 10,
        }),
      ),
    ).rejects.toThrow('El tamaño de página de inventario no es válido.');

    expect(repository.lastQuery).toBeNull();
  });
});

/**
 * Crea el servicio con una fecha estable para los tests.
 */
function createService(repository: FakeAlmacenRepository): AlmacenService {
  return new AlmacenService(repository, (): Date => new Date('2026-09-07T08:00:00.000Z'));
}

/**
 * Crea una consulta pública válida para los tests.
 */
function createConsulta(overrides: Partial<InventarioConsulta> = {}): InventarioConsulta {
  return {
    idProveedor: null,
    idMarca: null,
    idCategoria: null,
    texto: '',
    conDescuento: false,
    pagina: 1,
    num: 20,
    ...overrides,
  };
}
