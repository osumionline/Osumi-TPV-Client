import AlmacenService from '@backend/application/almacen/almacen.service';
import type AlmacenRepository from '@backend/contracts/almacen/almacen.repository.interface';
import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidad-query.interface';
import type InventarioFilterQuery from '@backend/contracts/almacen/inventario-filter-query.interface';
import type InventarioRepositoryQuery from '@backend/contracts/almacen/inventario-query.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadResultadoRecord,
} from '@backend/domain/almacen/caducidad-record.interface';
import type { CaducidadReportRecord } from '@backend/domain/almacen/caducidad-report-record.interface';
import type { InventarioResultadoRecord } from '@backend/domain/almacen/inventario-record.interface';
import type { InventarioReportRecord } from '@backend/domain/almacen/inventario-report-record.interface';
import type InventarioSaveRecord from '@backend/domain/almacen/inventario-save-record.interface';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import type {
  CaducidadReportConsulta,
  CaducidadReportInterface,
} from '@desktop-contracts/almacen/caducidad-report.interface';
import type {
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidad.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';
import { describe, expect, it } from 'vitest';

class FakeAlmacenRepository implements AlmacenRepository {
  lastQuery: InventarioRepositoryQuery | null = null;
  lastSavedCommands: readonly InventarioSaveRecord[] | null = null;
  lastDeactivatedArticuloId: number | null = null;
  lastReportQuery: InventarioFilterQuery | null = null;

  reportResult: InventarioReportRecord = {
    rows: [],
    totalRows: 0,
    mediaMargenMicroporcentaje: 0,
    totalPucMicros: 0,
    totalPvpCents: 0,
  };

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

  lastCaducidadQuery: CaducidadRepositoryQuery | null = null;
  lastCaducidadReportQuery: CaducidadFilterQuery | null = null;
  caducidadReportResult: CaducidadReportRecord = {
    anios: [
      {
        anio: 2025,
        unidades: 3,
        totalPvpCents: 5070,
        totalPucMicros: 35_760_000,
        meses: [
          {
            mes: 12,
            unidades: 3,
            totalPvpCents: 5070,
            totalPucMicros: 35_760_000,
            marcas: [
              {
                idMarca: 3,
                nombre: 'Marca de prueba',
                unidades: 3,
                totalPvpCents: 5070,
                totalPucMicros: 35_760_000,
              },
            ],
          },
        ],
      },
    ],
    totalUnidades: 3,
    totalPvpCents: 5070,
    totalPucMicros: 35_760_000,
  };

  caducidadResult: CaducidadResultadoRecord = {
    rows: [
      {
        id: 8,
        publicId: 'expiration-public-id',
        idArticulo: 25,
        localizador: 261234,
        idMarca: 3,
        marcaNombre: 'Marca de prueba',
        nombre: 'Artículo histórico',
        unidades: 3,
        pvpCents: 1690,
        pucMicros: 11_920_000,
        totalPvpCents: 5070,
        fechaBaja: '2025-12-05T10:30:00.000Z',
      },
    ],
    totalRows: 1,
    totalUnidades: 3,
    totalPvpCents: 5070,
    totalPucMicros: 35_760_000,
  };

  caducidadFilterOptions: CaducidadFilterOptionsRecord = {
    anios: [2026, 2025],
    marcas: [
      {
        idMarca: 3,
        nombre: 'Marca de prueba',
      },
    ],
  };

  lastCaducidadArticleSearch: string | null = null;
  lastCreatedCaducidad: CaducidadCreateRecord | null = null;
  lastDeactivatedCaducidadId: number | null = null;

  caducidadArticleSearchResult: readonly CaducidadArticuloSearchRecord[] = [
    {
      id: 25,
      localizador: 261234,
      marcaNombre: 'Marca de prueba',
      nombre: 'Artículo de prueba',
      stock: 8,
      pucMicros: 744_580,
      pvpCents: 100,
    },
  ];

  /**
   * Devuelve el resultado configurado y conserva la consulta recibida.
   */
  searchInventario(query: InventarioRepositoryQuery): Promise<InventarioResultadoRecord> {
    this.lastQuery = query;

    return Promise.resolve(this.result);
  }

  /**
   * Devuelve el reporte configurado para los tests.
   */
  getInventarioReport(query: InventarioFilterQuery): Promise<InventarioReportRecord> {
    this.lastReportQuery = query;

    return Promise.resolve(this.reportResult);
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

  /**
   * Devuelve las caducidades configuradas y conserva
   * la consulta recibida.
   */
  searchCaducidades(query: CaducidadRepositoryQuery): Promise<CaducidadResultadoRecord> {
    this.lastCaducidadQuery = query;

    return Promise.resolve(this.caducidadResult);
  }

  /**
   * Devuelve el informe configurado y conserva
   * los filtros recibidos.
   */
  getCaducidadReport(query: CaducidadFilterQuery): Promise<CaducidadReportRecord> {
    this.lastCaducidadReportQuery = query;

    return Promise.resolve(this.caducidadReportResult);
  }

  /**
   * Devuelve las opciones históricas configuradas.
   */
  getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsRecord> {
    return Promise.resolve(this.caducidadFilterOptions);
  }

  /**
   * Devuelve los artículos configurados para el buscador.
   */
  searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchRecord[]> {
    this.lastCaducidadArticleSearch = texto;

    return Promise.resolve(this.caducidadArticleSearchResult);
  }

  /**
   * Conserva el alta recibida para los tests.
   */
  createCaducidad(command: CaducidadCreateRecord): Promise<void> {
    this.lastCreatedCaducidad = command;

    return Promise.resolve();
  }

  /**
   * Conserva la caducidad recibida para los tests de reversión.
   */
  deactivateCaducidad(idCaducidad: number): Promise<void> {
    this.lastDeactivatedCaducidadId = idCaducidad;

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

  it('normaliza una fila antes de persistirla', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await service.saveInventarioRow(
      createSaveCommand({
        idsCategorias: [7, 2, 7],
        stock: -3,
        codigoAdicional: '  EXTRA-25  ',
      }),
    );

    expect(repository.lastSavedCommands).toEqual([
      {
        idArticulo: 25,
        idsCategorias: [2, 7],
        stock: -3,
        precioAlbaranMicros: 590_000,
        pucMicros: 744_580,
        pvpCents: 100,
        margenMicroporcentaje: 255_420,
        codigoAdicional: 'EXTRA-25',
      },
    ]);
  });

  it('rechaza artículos repetidos antes de Guardar todos', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);
    const command: InventarioSaveCommand = createSaveCommand();

    await expect(
      service.saveInventarioRows([
        command,
        {
          ...command,
        },
      ]),
    ).rejects.toThrow('Hay artículos repetidos en el guardado de inventario.');

    expect(repository.lastSavedCommands).toBeNull();
  });

  it('rechaza columnas repetidas antes de generar un reporte', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(
      service.getInventarioReport({
        idProveedor: null,
        idMarca: null,
        idCategoria: null,
        texto: '',
        conDescuento: false,
        columnas: ['nombre', 'nombre'],
      }),
    ).rejects.toThrow('Hay columnas repetidas en el reporte.');

    expect(repository.lastReportQuery).toBeNull();
  });

  it('normaliza filtros y paginación de Caducidades', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const result: CaducidadResultado = await service.searchCaducidades({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: '  pienso adulto  ',
      pagina: 3,
      num: 50,
    });

    expect(repository.lastCaducidadQuery).toEqual({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: 'pienso adulto',
      offset: 100,
      limit: 50,
    });

    expect(result).toEqual({
      rows: [
        {
          id: 8,
          publicId: 'expiration-public-id',
          idArticulo: 25,
          localizador: 261234,
          idMarca: 3,
          marcaNombre: 'Marca de prueba',
          nombre: 'Artículo histórico',
          unidades: 3,
          pvpCents: 1690,
          pucMicros: 11_920_000,
          totalPvpCents: 5070,
          fechaBaja: '2025-12-05T10:30:00.000Z',
        },
      ],
      totalRows: 1,
      totalUnidades: 3,
      totalPvpCents: 5070,
      totalPucMicros: 35_760_000,
    });
  });

  it('permite filtrar por mes sin indicar año', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await service.searchCaducidades({
      anio: null,
      mes: 7,
      idMarca: null,
      nombre: '',
      pagina: 1,
      num: 20,
    });

    expect(repository.lastCaducidadQuery).toEqual({
      anio: null,
      mes: 7,
      idMarca: null,
      nombre: null,
      offset: 0,
      limit: 20,
    });
  });

  it('rechaza un mes de Caducidades no válido', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(
      service.searchCaducidades({
        anio: 2025,
        mes: 13,
        idMarca: null,
        nombre: '',
        pagina: 1,
        num: 50,
      }),
    ).rejects.toThrow('El mes del filtro de caducidades no es válido.');

    expect(repository.lastCaducidadQuery).toBeNull();
  });

  it('expone las opciones históricas de Caducidades', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const result: CaducidadFilterOptionsInterface = await service.getCaducidadFilterOptions();

    expect(result).toEqual({
      anios: [2026, 2025],
      marcas: [
        {
          idMarca: 3,
          nombre: 'Marca de prueba',
        },
      ],
    });
  });

  it('normaliza la búsqueda de artículos para Caducidades', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const result: readonly CaducidadArticuloSearchInterface[] =
      await service.searchCaducidadArticulos('  artículo  ');

    expect(repository.lastCaducidadArticleSearch).toBe('artículo');

    expect(result).toEqual([
      {
        id: 25,
        localizador: 261234,
        marcaNombre: 'Marca de prueba',
        nombre: 'Artículo de prueba',
        stock: 8,
        pucMicros: 744_580,
        pvpCents: 100,
      },
    ]);
  });

  it('no consulta el repository con una búsqueda vacía de Caducidades', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const result = await service.searchCaducidadArticulos('   ');

    expect(result).toEqual([]);
    expect(repository.lastCaducidadArticleSearch).toBeNull();
  });

  it('normaliza el alta de una caducidad con la fecha actual', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    const command: CaducidadCreateCommand = {
      idArticulo: 25,
      unidades: 3,
    };

    await service.createCaducidad(command);

    expect(repository.lastCreatedCaducidad).toEqual({
      idArticulo: 25,
      unidades: 3,
      fechaBaja: '2026-09-07T08:00:00.000Z',
    });
  });

  it('rechaza unidades de caducidad no positivas', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(
      service.createCaducidad({
        idArticulo: 25,
        unidades: 0,
      }),
    ).rejects.toThrow('Las unidades deben ser un entero mayor que cero.');

    expect(repository.lastCreatedCaducidad).toBeNull();
  });

  it('valida y delega la reversión de una caducidad', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await service.deactivateCaducidad(8);

    expect(repository.lastDeactivatedCaducidadId).toBe(8);
  });

  it('rechaza identificadores de caducidad no válidos al revertir', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);

    await expect(service.deactivateCaducidad(0)).rejects.toThrow(
      'El identificador de la caducidad no es válido.',
    );

    expect(repository.lastDeactivatedCaducidadId).toBeNull();
  });

  it('normaliza los filtros antes de crear el informe de Caducidades', async (): Promise<void> => {
    const repository = new FakeAlmacenRepository();
    const service = createService(repository);
    const consulta: CaducidadReportConsulta = {
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: '  pienso adulto  ',
    };

    const result: CaducidadReportInterface = await service.getCaducidadReport(consulta);

    expect(repository.lastCaducidadReportQuery).toEqual({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: 'pienso adulto',
    });

    expect(result).toEqual({
      anios: [
        {
          anio: 2025,
          unidades: 3,
          totalPvpCents: 5070,
          totalPucMicros: 35_760_000,
          meses: [
            {
              mes: 12,
              unidades: 3,
              totalPvpCents: 5070,
              totalPucMicros: 35_760_000,
              marcas: [
                {
                  idMarca: 3,
                  nombre: 'Marca de prueba',
                  unidades: 3,
                  totalPvpCents: 5070,
                  totalPucMicros: 35_760_000,
                },
              ],
            },
          ],
        },
      ],
      totalUnidades: 3,
      totalPvpCents: 5070,
      totalPucMicros: 35_760_000,
    });
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

/**
 * Crea un comando de escritura válido para los tests.
 */
function createSaveCommand(overrides: Partial<InventarioSaveCommand> = {}): InventarioSaveCommand {
  return {
    idArticulo: 25,
    idsCategorias: [2, 7],
    stock: 8,
    precioAlbaranMicros: 590_000,
    pucMicros: 744_580,
    pvpCents: 100,
    margenMicroporcentaje: 255_420,
    codigoAdicional: null,
    ...overrides,
  };
}
