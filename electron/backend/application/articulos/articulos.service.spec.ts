import ArticulosService from '@backend/application/articulos/articulos.service';
import type ArticuloEstadisticasRepositoryQuery from '@backend/contracts/articulos/articulo-estadisticas-query.interface';
import type ArticuloHistoricoRepositoryQuery from '@backend/contracts/articulos/articulo-historico-query.interface';
import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type { ArticuloEstadisticasRepositoryResult } from '@backend/domain/articulos/articulo-estadisticas-record.interface';
import type { ArticuloHistoricoPageRecord } from '@backend/domain/articulos/articulo-historico-record.interface';
import type {
  ArticuloAccesoDirectoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import type { ArticuloSaveRecord } from '@backend/domain/articulos/articulo-save-record.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import { ArticuloSaveInterface } from '@desktop-contracts/articulos/articulo-save.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import { describe, expect, it } from 'vitest';

class FakeArticulosRepository implements ArticulosRepository {
  record: ArticuloRecord | null = createArticuloRecord();
  resolvedId: number | null = 25;
  lastCode: string | null = null;
  lastNumericCode: number | null = null;
  deactivatedId: number | null = null;
  createdCommand: ArticuloSaveRecord | null = null;
  updatedCommand: ArticuloSaveRecord | null = null;
  createError: Error | null = null;
  updateError: Error | null = null;
  accesosDirectos: readonly ArticuloAccesoDirectoRecord[] = [
    {
      id: 25,
      publicId: 'article-public-id',
      accesoDirecto: 12,
      nombre: 'Artículo de prueba',
    },
  ];
  lastAccesoDirectoIdArticulo: number | null = null;
  lastAccesoDirecto: number | null = null;
  historicoResult: ArticuloHistoricoPageRecord = {
    total: 1,
    items: [
      {
        id: 300,
        publicId: 'history-public-id',
        tipo: 4,
        stockPrevio: 5,
        diferencia: 3,
        stockFinal: 8,
        idVenta: null,
        idPedido: null,
        idMermaCaducidad: null,
        pucMicros: 744_580,
        pvpMicros: 1_000_000,
        createdAt: '2026-09-02T08:00:00.000Z',
      },
    ],
  };
  lastHistoricoQuery: ArticuloHistoricoRepositoryQuery | null = null;
  estadisticasResult: ArticuloEstadisticasRepositoryResult = {
    years: [2025, 2026],
    items: [
      {
        year: 2026,
        month: 9,
        day: null,
        value: 2_500_000,
      },
    ],
  };
  lastEstadisticasQuery: ArticuloEstadisticasRepositoryQuery | null = null;

  /**
   * Devuelve el artículo configurado para el test.
   */
  findById(idArticulo: number): Promise<ArticuloRecord | null> {
    return Promise.resolve(this.record?.id === idArticulo ? this.record : null);
  }

  /**
   * Registra el código recibido y devuelve el id configurado.
   */
  resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null> {
    this.lastCode = codigo;
    this.lastNumericCode = codigoNumerico;

    return Promise.resolve(this.resolvedId);
  }

  /**
   * Devuelve la página histórica configurada para el test.
   */
  findHistorico(query: ArticuloHistoricoRepositoryQuery): Promise<ArticuloHistoricoPageRecord> {
    this.lastHistoricoQuery = query;

    return Promise.resolve(this.historicoResult);
  }

  /**
   * Devuelve los agregados estadísticos configurados.
   */
  findEstadisticas(
    query: ArticuloEstadisticasRepositoryQuery,
  ): Promise<ArticuloEstadisticasRepositoryResult> {
    this.lastEstadisticasQuery = query;

    return Promise.resolve(this.estadisticasResult);
  }

  /**
   * Devuelve los accesos directos configurados para el test.
   */
  findAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoRecord[]> {
    return Promise.resolve(this.accesosDirectos);
  }

  /**
   * Registra la modificación de un acceso directo.
   */
  setAccesoDirecto(idArticulo: number, accesoDirecto: number | null): Promise<void> {
    this.lastAccesoDirectoIdArticulo = idArticulo;
    this.lastAccesoDirecto = accesoDirecto;

    return Promise.resolve();
  }

  /**
   * Simula la creación de un artículo.
   */
  create(command: ArticuloSaveRecord): Promise<number> {
    this.createdCommand = command;

    if (this.createError !== null) {
      return Promise.reject(this.createError);
    }

    return Promise.resolve(25);
  }

  /**
   * Simula la actualización de un artículo.
   */
  update(command: ArticuloSaveRecord): Promise<void> {
    this.updatedCommand = command;

    if (this.updateError !== null) {
      return Promise.reject(this.updateError);
    }

    return Promise.resolve();
  }

  /**
   * Simula la baja lógica de un artículo.
   */
  deactivate(idArticulo: number): Promise<void> {
    this.deactivatedId = idArticulo;

    return Promise.resolve();
  }
}

class FakeImageAssetPromoter implements ImageAssetPromoter {
  preparedIds: string[] = [];
  rolledBackIds: string[] = [];

  /**
   * Simula la promoción de una imagen staged.
   */
  prepare(stagingId: string): Promise<PreparedImageAsset> {
    this.preparedIds.push(stagingId);

    return Promise.resolve({
      stagingId,
      archivo: {
        publicId: `file-${stagingId}`,
        purpose: 'article_image',
        originalName: `${stagingId}.jpg`,
        internalName: `file-${stagingId}.webp`,
        relativePath: `files/articles/file-${stagingId}.webp`,
        mimeType: 'image/webp',
        sizeBytes: 100,
        sha256: 'a'.repeat(64),
        width: 800,
        height: 600,
      },
    });
  }

  /**
   * Registra una copia definitiva revertida.
   */
  rollback(prepared: PreparedImageAsset): Promise<void> {
    this.rolledBackIds.push(prepared.stagingId);

    return Promise.resolve();
  }
}

class FakeStagedImageDiscarder implements StagedImageDiscarder {
  discardedIds: string[] = [];

  /**
   * Registra un staging consumido.
   */
  discard(stagingId: string): Promise<void> {
    this.discardedIds.push(stagingId);

    return Promise.resolve();
  }
}

class FakeAssetUrlBuilder implements AssetUrlBuilder {
  /**
   * Convierte una ruta relativa en una URL predecible para el test.
   */
  build(relativePath: string | null): string | null {
    return relativePath === null ? null : `osumi-asset://${relativePath}`;
  }
}

describe('ArticulosService', (): void => {
  it('expone el detalle completo de un artículo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const articulo: ArticuloInterface | null = await service.getById(25);

    expect(articulo).toMatchObject({
      id: 25,
      localizador: 261234,
      nombre: 'Artículo de prueba',
      idsCategorias: [2, 7],
      ventaOnline: true,
      mostrarEnWeb: false,
    });

    expect(articulo?.codigosBarras).toHaveLength(2);
    expect(articulo?.fotos[0]?.url).toBe('osumi-asset://articles/25/photo.webp');
  });

  it('normaliza un localizador numérico antes de resolverlo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const articulo: ArticuloInterface | null = await service.resolveByCode(' 261234 ');

    expect(articulo?.id).toBe(25);
    expect(repository.lastCode).toBe('261234');
    expect(repository.lastNumericCode).toBe(261234);
  });

  it('trata un código alfanumérico exclusivamente como código de barras', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await service.resolveByCode('ABC-123');

    expect(repository.lastCode).toBe('ABC-123');
    expect(repository.lastNumericCode).toBeNull();
  });

  it('no consulta el repository con un código vacío', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const articulo: ArticuloInterface | null = await service.resolveByCode('   ');

    expect(articulo).toBeNull();
    expect(repository.lastCode).toBeNull();
  });

  it('delega la baja de un artículo válido en el repository', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await service.deactivate(25);

    expect(repository.deactivatedId).toBe(25);
  });

  it('rechaza un identificador inválido al dar de baja', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await expect(service.deactivate(0)).rejects.toThrow(
      'El identificador del artículo no es válido.',
    );

    expect(repository.deactivatedId).toBeNull();
  });

  it('crea un artículo promoviendo sus imágenes staged', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const promoter = new FakeImageAssetPromoter();
    const discarder = new FakeStagedImageDiscarder();
    const service = createService(repository, promoter, discarder);

    const result: ArticuloInterface = await service.save(
      createSaveCommand({
        fotos: [
          {
            id: null,
            stagingId: 'staged-photo',
            orden: 0,
            principal: true,
          },
        ],
      }),
    );

    expect(result.id).toBe(25);
    expect(promoter.preparedIds).toEqual(['staged-photo']);
    expect(discarder.discardedIds).toEqual(['staged-photo']);

    expect(repository.createdCommand?.fotos).toEqual([
      expect.objectContaining({
        idArchivo: null,
        orden: 0,
        principal: true,
        nuevoArchivo: expect.objectContaining({
          purpose: 'article_image',
          relativePath: 'files/articles/file-staged-photo.webp',
        }),
      }),
    ]);

    expect(repository.createdCommand?.codigosBarrasAdicionales[0]?.codigo).toBe('NEW-BARCODE');
  });

  it('edita un artículo conservando referencias de fotos persistidas', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const promoter = new FakeImageAssetPromoter();
    const service = createService(repository, promoter);

    await service.save(
      createSaveCommand({
        id: 25,
        fotos: [
          {
            id: 200,
            stagingId: null,
            orden: 0,
            principal: true,
          },
        ],
      }),
    );

    expect(repository.updatedCommand?.fotos).toEqual([
      {
        idArchivo: 200,
        nuevoArchivo: null,
        orden: 0,
        principal: true,
      },
    ]);

    expect(promoter.preparedIds).toHaveLength(0);
  });

  it('revierte las imágenes definitivas si falla la persistencia', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    repository.createError = new Error('Database error');

    const promoter = new FakeImageAssetPromoter();
    const discarder = new FakeStagedImageDiscarder();

    const service = createService(repository, promoter, discarder);

    await expect(
      service.save(
        createSaveCommand({
          fotos: [
            {
              id: null,
              stagingId: 'staged-photo',
              orden: 0,
              principal: true,
            },
          ],
        }),
      ),
    ).rejects.toThrow('Database error');

    expect(promoter.rolledBackIds).toEqual(['staged-photo']);

    expect(discarder.discardedIds).toHaveLength(0);
  });

  it('obtiene los accesos directos asignados', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const accesos = await service.getAccesosDirectos();

    expect(accesos).toEqual([
      {
        id: 25,
        publicId: 'article-public-id',
        accesoDirecto: 12,
        nombre: 'Artículo de prueba',
      },
    ]);
  });

  it('delega la asignación de un acceso directo válido en el repository', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await service.setAccesoDirecto({
      idArticulo: 25,
      accesoDirecto: 7,
    });

    expect(repository.lastAccesoDirectoIdArticulo).toBe(25);
    expect(repository.lastAccesoDirecto).toBe(7);
  });

  it('permite eliminar un acceso directo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await service.setAccesoDirecto({
      idArticulo: 25,
      accesoDirecto: null,
    });

    expect(repository.lastAccesoDirectoIdArticulo).toBe(25);
    expect(repository.lastAccesoDirecto).toBeNull();
  });

  it('rechaza un acceso directo no válido', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await expect(
      service.setAccesoDirecto({
        idArticulo: 25,
        accesoDirecto: 0,
      }),
    ).rejects.toThrow('El acceso directo debe ser un entero positivo.');

    expect(repository.lastAccesoDirectoIdArticulo).toBeNull();
  });

  it('obtiene una página validada del histórico de un artículo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const result = await service.getHistorico({
      idArticulo: 25,
      pagina: 2,
      num: 20,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    });

    expect(repository.lastHistoricoQuery).toEqual({
      idArticulo: 25,
      offset: 20,
      limit: 20,
      orderBy: 'createdAt',
      orderDirection: 'desc',
    });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      tipo: 4,
      stockPrevio: 5,
      diferencia: 3,
      stockFinal: 8,
    });
  });

  it('rechaza tamaños de página arbitrarios en el histórico', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await expect(
      service.getHistorico({
        idArticulo: 25,
        pagina: 1,
        num: 10,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }),
    ).rejects.toThrow('El tamaño de página del histórico no es válido.');

    expect(repository.lastHistoricoQuery).toBeNull();
  });

  it('obtiene estadísticas agregadas y traduce el tipo a la métrica interna', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    const result = await service.getEstadisticas({
      idArticulo: 25,
      tipo: 'importe',
      year: 2026,
      month: null,
    });

    expect(repository.lastEstadisticasQuery).toEqual({
      idArticulo: 25,
      metric: 'amount',
      year: 2026,
      month: null,
    });

    expect(result.points).toHaveLength(12);
    expect(result.points[8]?.value).toBe(2_500_000);
  });

  it('rechaza un mes inválido antes de consultar SQLite', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = createService(repository);

    await expect(
      service.getEstadisticas({
        idArticulo: 25,
        tipo: 'unidades',
        year: 2026,
        month: 13,
      }),
    ).rejects.toThrow('El mes de las estadísticas no es válido.');

    expect(repository.lastEstadisticasQuery).toBeNull();
  });
});

/**
 * Crea un artículo completo para los tests del servicio.
 */
function createArticuloRecord(): ArticuloRecord {
  return {
    id: 25,
    publicId: 'article-public-id',
    localizador: 261234,
    nombre: 'Artículo de prueba',
    idMarca: 3,
    idProveedor: 4,
    idsCategorias: [2, 7],
    referencia: 'REF-25',
    precioAlbaranMicros: 590000,
    pucMicros: 744580,
    pvpCents: 100,
    pvpDescuentoCents: 90,
    ivaBps: 2100,
    reBps: 520,
    margenMicroporcentaje: 255420,
    margenDescuentoMicroporcentaje: 172689,
    stock: 8,
    stockMin: 2,
    stockMax: 20,
    loteOptimo: 5,
    ventaOnline: true,
    mostrarEnWeb: false,
    descripcionCorta: 'Descripción corta',
    descripcionLarga: 'Descripción larga',
    observaciones: 'Observaciones',
    mostrarObservacionesPedidos: true,
    mostrarObservacionesVentas: false,
    accesoDirecto: 12,
    codigosBarras: [
      {
        id: 100,
        publicId: 'barcode-default',
        codigo: '261234',
        porDefecto: true,
      },
      {
        id: 101,
        publicId: 'barcode-extra',
        codigo: 'ABC-123',
        porDefecto: false,
      },
    ],
    fotos: [
      {
        id: 200,
        publicId: 'photo-public-id',
        originalName: 'photo.jpg',
        relativePath: 'articles/25/photo.webp',
        mimeType: 'image/webp',
        sizeBytes: 12345,
        width: 800,
        height: 800,
        orden: 0,
        principal: true,
      },
    ],
  };
}

/**
 * Crea el servicio de Artículos con dependencias de test.
 */
function createService(
  repository: FakeArticulosRepository = new FakeArticulosRepository(),
  promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter(),
  discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder(),
): ArticulosService {
  return new ArticulosService(repository, new FakeAssetUrlBuilder(), promoter, discarder);
}

/**
 * Crea un comando público de guardado para los tests.
 */
function createSaveCommand(overrides: Partial<ArticuloSaveInterface> = {}): ArticuloSaveInterface {
  return {
    id: null,
    nombre: 'Artículo nuevo',
    idMarca: 3,
    idProveedor: 4,
    idsCategorias: [2, 7],
    referencia: 'REF-NEW',
    precioAlbaranMicros: 590000,
    pucMicros: 744580,
    pvpCents: 100,
    pvpDescuentoCents: null,
    ivaBps: 2100,
    reBps: 520,
    margenMicroporcentaje: 255420,
    margenDescuentoMicroporcentaje: null,
    stock: 5,
    stockMin: 2,
    stockMax: 20,
    loteOptimo: 5,
    ventaOnline: true,
    mostrarEnWeb: false,
    descripcionCorta: 'Descripción corta',
    descripcionLarga: 'Descripción larga',
    observaciones: null,
    mostrarObservacionesPedidos: false,
    mostrarObservacionesVentas: false,
    accesoDirecto: 99,
    codigosBarrasAdicionales: [
      {
        id: null,
        codigo: ' NEW-BARCODE ',
      },
    ],
    fotos: [],
    ...overrides,
  };
}
