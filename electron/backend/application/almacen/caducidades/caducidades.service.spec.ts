import CaducidadesService from '@backend/application/almacen/caducidades/caducidades.service';
import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidades/caducidad-filter-query.interface';
import type CaducidadRepositoryQuery from '@backend/contracts/almacen/caducidades/caducidad-query.interface';
import type CaducidadesRepository from '@backend/contracts/almacen/caducidades/caducidades.repository.interface';
import type {
  CaducidadArticuloSearchRecord,
  CaducidadCreateRecord,
} from '@backend/domain/almacen/caducidades/caducidad-create-record.interface';
import type {
  CaducidadFilterOptionsRecord,
  CaducidadResultadoRecord,
} from '@backend/domain/almacen/caducidades/caducidad-record.interface';
import type { CaducidadReportRecord } from '@backend/domain/almacen/caducidades/caducidad-report-record.interface';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidades/caducidad-create.interface';
import type {
  CaducidadReportConsulta,
  CaducidadReportInterface,
} from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
import type {
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidades/caducidad.interface';
import { describe, expect, it } from 'vitest';

class FakeCaducidadesRepository implements CaducidadesRepository {
  lastQuery: CaducidadRepositoryQuery | null = null;
  lastReportQuery: CaducidadFilterQuery | null = null;
  lastArticleSearch: string | null = null;
  lastCreatedCaducidad: CaducidadCreateRecord | null = null;
  lastDeactivatedCaducidadId: number | null = null;

  filterOptions: CaducidadFilterOptionsRecord = {
    anios: [2026, 2025],
    marcas: [
      {
        idMarca: 3,
        nombre: 'Marca de prueba',
      },
    ],
  };

  articleSearchResult: readonly CaducidadArticuloSearchRecord[] = [
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

  result: CaducidadResultadoRecord = {
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

  reportResult: CaducidadReportRecord = {
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

  searchCaducidades(query: CaducidadRepositoryQuery): Promise<CaducidadResultadoRecord> {
    this.lastQuery = query;

    return Promise.resolve(this.result);
  }

  getCaducidadReport(query: CaducidadFilterQuery): Promise<CaducidadReportRecord> {
    this.lastReportQuery = query;

    return Promise.resolve(this.reportResult);
  }

  getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsRecord> {
    return Promise.resolve(this.filterOptions);
  }

  searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchRecord[]> {
    this.lastArticleSearch = texto;

    return Promise.resolve(this.articleSearchResult);
  }

  createCaducidad(command: CaducidadCreateRecord): Promise<void> {
    this.lastCreatedCaducidad = command;

    return Promise.resolve();
  }

  deactivateCaducidad(idCaducidad: number): Promise<void> {
    this.lastDeactivatedCaducidadId = idCaducidad;

    return Promise.resolve();
  }
}

describe('CaducidadesService', (): void => {
  it('normaliza filtros y paginación de Caducidades', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    const result: CaducidadResultado = await service.searchCaducidades({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: '  pienso adulto  ',
      pagina: 3,
      num: 50,
    });

    expect(repository.lastQuery).toEqual({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: 'pienso adulto',
      offset: 100,
      limit: 50,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.totalRows).toBe(1);
    expect(result.totalUnidades).toBe(3);
  });

  it('permite filtrar por mes sin indicar año', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    await service.searchCaducidades({
      anio: null,
      mes: 7,
      idMarca: null,
      nombre: '',
      pagina: 1,
      num: 20,
    });

    expect(repository.lastQuery).toEqual({
      anio: null,
      mes: 7,
      idMarca: null,
      nombre: null,
      offset: 0,
      limit: 20,
    });
  });

  it('rechaza un mes de Caducidades no válido', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
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

    expect(repository.lastQuery).toBeNull();
  });

  it('expone las opciones históricas de Caducidades', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
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
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    const result: readonly CaducidadArticuloSearchInterface[] =
      await service.searchCaducidadArticulos('  artículo  ');

    expect(repository.lastArticleSearch).toBe('artículo');
    expect(result[0]?.id).toBe(25);
  });

  it('no consulta el repository con una búsqueda vacía', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    const result = await service.searchCaducidadArticulos('   ');

    expect(result).toEqual([]);
    expect(repository.lastArticleSearch).toBeNull();
  });

  it('normaliza el alta con la fecha actual', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
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

  it('rechaza unidades no positivas', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    await expect(
      service.createCaducidad({
        idArticulo: 25,
        unidades: 0,
      }),
    ).rejects.toThrow('Las unidades deben ser un entero mayor que cero.');

    expect(repository.lastCreatedCaducidad).toBeNull();
  });

  it('valida y delega la reversión', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    await service.deactivateCaducidad(8);

    expect(repository.lastDeactivatedCaducidadId).toBe(8);
  });

  it('rechaza identificadores no válidos al revertir', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    await expect(service.deactivateCaducidad(0)).rejects.toThrow(
      'El identificador de la caducidad no es válido.',
    );

    expect(repository.lastDeactivatedCaducidadId).toBeNull();
  });

  it('normaliza filtros antes de crear el informe', async (): Promise<void> => {
    const repository = new FakeCaducidadesRepository();
    const service = createService(repository);

    const consulta: CaducidadReportConsulta = {
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: '  pienso adulto  ',
    };

    const result: CaducidadReportInterface = await service.getCaducidadReport(consulta);

    expect(repository.lastReportQuery).toEqual({
      anio: 2025,
      mes: 12,
      idMarca: 3,
      nombre: 'pienso adulto',
    });

    expect(result.totalUnidades).toBe(3);
    expect(result.totalPvpCents).toBe(5070);
    expect(result.anios[0]?.meses[0]?.marcas[0]?.nombre).toBe('Marca de prueba');
  });
});

/**
 * Crea un servicio con fecha estable.
 */
function createService(repository: FakeCaducidadesRepository): CaducidadesService {
  return new CaducidadesService(repository, (): Date => new Date('2026-09-07T08:00:00.000Z'));
}
