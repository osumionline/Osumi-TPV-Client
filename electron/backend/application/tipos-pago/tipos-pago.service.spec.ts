import TiposPagoService from '@backend/application/tipos-pago/tipos-pago.service';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type ActualizarTipoPagoRecordCommand from '@backend/contracts/tipos-pago/actualizar-tipo-pago-record-command.interface';
import type CrearTipoPagoRecordCommand from '@backend/contracts/tipos-pago/crear-tipo-pago-record-command.interface';
import type TipoPagoEstadisticasRepositoryQuery from '@backend/contracts/tipos-pago/tipo-pago-estadisticas-query.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type { TipoPagoEstadisticasRepositoryResult } from '@backend/domain/tipos-pago/tipo-pago-estadisticas-record.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type ReordenarTiposPagoCommand from '@desktop-contracts/configuration/tipos-pago/reordenar-tipos-pago-command.interface';
import type { TipoPagoEstadisticasResultado } from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let tiposPago: readonly TipoPagoRecord[];
let lastCreateCommand: CrearTipoPagoRecordCommand | null;
let lastUpdateId: number | null;
let lastUpdateCommand: ActualizarTipoPagoRecordCommand | null;
let lastDeactivateId: number | null;
let lastReorderIds: readonly number[] | null;
let createError: Error | null;
let updateError: Error | null;
let lastEstadisticasQuery: TipoPagoEstadisticasRepositoryQuery | null;
let estadisticasResult: TipoPagoEstadisticasRepositoryResult;

class FakeImageAssetPromoter implements ImageAssetPromoter {
  readonly preparedRequests: {
    readonly stagingId: string;
    readonly purpose: ImageAssetPurpose;
  }[] = [];

  readonly rolledBackIds: string[] = [];

  /**
   * Simula la promoción de un logo
   * staged de Tipo de pago.
   */
  prepare(stagingId: string, expectedPurpose: ImageAssetPurpose): Promise<PreparedImageAsset> {
    this.preparedRequests.push({
      stagingId,
      purpose: expectedPurpose,
    });

    return Promise.resolve({
      stagingId,
      archivo: {
        publicId: `file-${stagingId}`,
        purpose: expectedPurpose,
        originalName: `${stagingId}.png`,
        internalName: `file-${stagingId}.webp`,
        relativePath: `files/payment-types/file-${stagingId}.webp`,
        mimeType: 'image/webp',
        sizeBytes: 100,
        sha256: 'a'.repeat(64),
        width: 256,
        height: 256,
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
  readonly discardedIds: string[] = [];

  error: Error | null = null;

  /**
   * Registra un staging consumido.
   */
  discard(stagingId: string): Promise<void> {
    this.discardedIds.push(stagingId);

    return this.error === null ? Promise.resolve() : Promise.reject(this.error);
  }
}

class FakeAssetUrlBuilder implements AssetUrlBuilder {
  /**
   * Simula la URL pública de un asset.
   */
  build(relativePath: string | null): string | null {
    return relativePath === null ? null : `osumi://assets/${relativePath}`;
  }
}

describe('TiposPagoService', (): void => {
  beforeEach((): void => {
    tiposPago = [
      createRecord(),
      createRecord({
        id: 2,
        publicId: 'tipo-pago-visa',
        nombre: 'VISA',
        slug: 'visa',
        fotoRelativePath: 'files/payment-types/visa.webp',
        afectaCaja: false,
        orden: 1,
        fisico: true,
      }),
    ];

    lastCreateCommand = null;
    lastUpdateId = null;
    lastUpdateCommand = null;
    lastDeactivateId = null;
    lastReorderIds = null;
    createError = null;
    updateError = null;
    lastEstadisticasQuery = null;

    estadisticasResult = {
      years: [2025, 2026],
      items: [
        {
          year: 2026,
          month: 9,
          day: 1,
          importeCents: 1_500,
        },
      ],
      totalImporteCents: 1_500,
      operaciones: 3,
      totalGlobalCents: 6_000,
    };
  });

  it('devuelve el maestro activo transformando las rutas de los logos', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await expect(service.getAll()).resolves.toEqual([
      createInterface(),
      createInterface({
        id: 2,
        publicId: 'tipo-pago-visa',
        nombre: 'VISA',
        slug: 'visa',
        foto: 'osumi://assets/files/payment-types/visa.webp',
        afectaCaja: false,
        orden: 1,
        fisico: true,
      }),
    ]);
  });

  it('mantiene Efectivo en el maestro interno aunque no tenga logo', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    const result: readonly TipoPagoInterface[] = await service.getAll();

    expect(result[0]?.slug).toBe('efectivo');

    expect(result[0]?.foto).toBeNull();
  });

  it('crea un tipo de pago generando el slug y promocionando su logo', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();

    const service: TiposPagoService = createService(promoter, discarder);

    const command: CrearTipoPagoCommand = {
      nombre: '  Tarjeta Crédito Ñandú  ',
      afectaCaja: false,
      fisico: true,
      logoStagingId: ' staged-logo ',
    };

    const result: TipoPagoInterface = await service.create(command);

    expect(promoter.preparedRequests).toEqual([
      {
        stagingId: 'staged-logo',
        purpose: 'payment_type_icon',
      },
    ]);

    expect(lastCreateCommand).toEqual({
      nombre: 'Tarjeta Crédito Ñandú',
      slug: 'tarjeta-credito-nandu',
      afectaCaja: false,
      fisico: true,
      nuevoLogo: expect.objectContaining({
        purpose: 'payment_type_icon',
        relativePath: 'files/payment-types/file-staged-logo.webp',
      }),
    });

    expect(discarder.discardedIds).toEqual(['staged-logo']);

    expect(result.slug).toBe('tarjeta-credito-nandu');
  });

  it('exige logo al crear un tipo de pago', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const service: TiposPagoService = createService(promoter);

    await expect(
      service.create({
        nombre: 'Bizum',
        afectaCaja: false,
        fisico: true,
        logoStagingId: '   ',
      }),
    ).rejects.toThrow('El logo del tipo de pago es obligatorio.');

    expect(promoter.preparedRequests).toHaveLength(0);

    expect(lastCreateCommand).toBeNull();
  });

  it('impide crear un slug ya utilizado por otro tipo activo', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await expect(
      service.create({
        nombre: 'Visa',
        afectaCaja: false,
        fisico: true,
        logoStagingId: 'logo',
      }),
    ).rejects.toThrow('Ya existe un tipo de pago activo con ese nombre.');

    expect(lastCreateCommand).toBeNull();
  });

  it('actualiza un tipo configurable conservando su logo', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const service: TiposPagoService = createService(promoter);

    const command: ActualizarTipoPagoCommand = {
      nombre: 'Tarjeta bancaria',
      afectaCaja: true,
      fisico: false,
      logoStagingId: null,
    };

    const result: TipoPagoInterface = await service.update(2, command);

    expect(lastUpdateId).toBe(2);

    expect(lastUpdateCommand).toEqual({
      nombre: 'Tarjeta bancaria',
      slug: 'tarjeta-bancaria',
      afectaCaja: true,
      fisico: false,
      nuevoLogo: null,
    });

    expect(promoter.preparedRequests).toHaveLength(0);

    expect(result.foto).toBe('osumi://assets/files/payment-types/visa.webp');
  });

  it('sustituye el logo promocionando el nuevo staging', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();

    const service: TiposPagoService = createService(promoter, discarder);

    const result: TipoPagoInterface = await service.update(2, {
      nombre: 'VISA',
      afectaCaja: false,
      fisico: true,
      logoStagingId: ' new-logo ',
    });

    expect(lastUpdateCommand?.nuevoLogo).toMatchObject({
      purpose: 'payment_type_icon',
      relativePath: 'files/payment-types/file-new-logo.webp',
    });

    expect(discarder.discardedIds).toEqual(['new-logo']);

    expect(result.foto).toBe('osumi://assets/files/payment-types/file-new-logo.webp');
  });

  it('exige un nuevo logo al editar un tipo legacy que no tiene ninguno', async (): Promise<void> => {
    tiposPago = [
      ...tiposPago,
      createRecord({
        id: 3,
        publicId: 'tipo-sin-logo',
        nombre: 'Sin logo',
        slug: 'sin-logo',
        fotoRelativePath: null,
        orden: 2,
      }),
    ];

    const service: TiposPagoService = createService();

    await expect(
      service.update(3, {
        nombre: 'Sin logo',
        afectaCaja: false,
        fisico: true,
        logoStagingId: null,
      }),
    ).rejects.toThrow('El logo del tipo de pago es obligatorio.');

    expect(lastUpdateCommand).toBeNull();
  });

  it('impide modificar Efectivo por una llamada directa al backend', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await expect(
      service.update(1, {
        nombre: 'Otro efectivo',
        afectaCaja: false,
        fisico: false,
        logoStagingId: null,
      }),
    ).rejects.toThrow('El tipo de pago Efectivo es estructural y no puede modificarse.');

    expect(lastUpdateCommand).toBeNull();
  });

  it('reordena todos los tipos configurables manteniendo Efectivo fuera del comando', async (): Promise<void> => {
    tiposPago = [
      ...tiposPago,
      createRecord({
        id: 3,
        publicId: 'tipo-pago-bizum',
        nombre: 'Bizum',
        slug: 'bizum',
        fotoRelativePath: 'files/payment-types/bizum.webp',
        afectaCaja: false,
        orden: 2,
        fisico: true,
      }),
    ];

    const service: TiposPagoService = createService();

    const command: ReordenarTiposPagoCommand = {
      ids: [3, 2],
    };

    const result: readonly TipoPagoInterface[] = await service.reorder(command);

    expect(lastReorderIds).toEqual([3, 2]);

    expect(
      result.map((tipoPago: TipoPagoInterface) => ({
        slug: tipoPago.slug,
        orden: tipoPago.orden,
      })),
    ).toEqual([
      {
        slug: 'efectivo',
        orden: 0,
      },
      {
        slug: 'bizum',
        orden: 1,
      },
      {
        slug: 'visa',
        orden: 2,
      },
    ]);
  });

  it('rechaza órdenes incompletos, duplicados o que incluyan Efectivo', async (): Promise<void> => {
    tiposPago = [
      ...tiposPago,
      createRecord({
        id: 3,
        publicId: 'tipo-pago-bizum',
        nombre: 'Bizum',
        slug: 'bizum',
        fotoRelativePath: 'files/payment-types/bizum.webp',
        orden: 2,
      }),
    ];

    const service: TiposPagoService = createService();

    await expect(
      service.reorder({
        ids: [2],
      }),
    ).rejects.toThrow('El orden recibido no coincide con los tipos de pago configurables activos.');

    await expect(
      service.reorder({
        ids: [2, 2],
      }),
    ).rejects.toThrow('El orden de tipos de pago contiene identificadores duplicados.');

    await expect(
      service.reorder({
        ids: [1, 2],
      }),
    ).rejects.toThrow('El orden recibido no coincide con los tipos de pago configurables activos.');

    expect(lastReorderIds).toBeNull();
  });

  it('impide eliminar Efectivo por una llamada directa al backend', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await expect(service.deactivate(1)).rejects.toThrow(
      'El tipo de pago Efectivo es estructural y no puede modificarse.',
    );

    expect(lastDeactivateId).toBeNull();
  });

  it('delega la baja lógica de un tipo configurable', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await service.deactivate(2);

    expect(lastDeactivateId).toBe(2);
  });

  it('revierte el logo preparado si falla el alta', async (): Promise<void> => {
    createError = new Error('Database error');

    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();

    const service: TiposPagoService = createService(promoter, discarder);

    await expect(
      service.create({
        nombre: 'Bizum',
        afectaCaja: false,
        fisico: true,
        logoStagingId: 'new-logo',
      }),
    ).rejects.toThrow('Database error');

    expect(promoter.rolledBackIds).toEqual(['new-logo']);

    expect(discarder.discardedIds).toHaveLength(0);
  });

  it('revierte el logo preparado si falla la actualización', async (): Promise<void> => {
    updateError = new Error('Database error');

    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();

    const service: TiposPagoService = createService(promoter);

    await expect(
      service.update(2, {
        nombre: 'VISA',
        afectaCaja: false,
        fisico: true,
        logoStagingId: 'replacement',
      }),
    ).rejects.toThrow('Database error');

    expect(promoter.rolledBackIds).toEqual(['replacement']);
  });

  it('devuelve las estadísticas del tipo de pago para el período solicitado', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    const result: TipoPagoEstadisticasResultado = await service.getEstadisticas({
      idTipoPago: 2,
      year: 2026,
      month: 9,
    });

    expect(lastEstadisticasQuery).toEqual({
      idTipoPago: 2,
      year: 2026,
      month: 9,
    });

    expect(result.totalImporteCents).toBe(1_500);

    expect(result.operaciones).toBe(3);

    expect(result.importeMedioCents).toBe(500);

    expect(result.porcentajeTotalBps).toBe(2_500);

    expect(result.points).toHaveLength(30);
  });

  it('rechaza períodos estadísticos incoherentes', async (): Promise<void> => {
    const service: TiposPagoService = createService();

    await expect(
      service.getEstadisticas({
        idTipoPago: 2,
        year: null,
        month: 9,
      }),
    ).rejects.toThrow('No se puede seleccionar un mes sin seleccionar un año.');

    expect(lastEstadisticasQuery).toBeNull();
  });
});

function createService(
  promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter(),
  discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder(),
): TiposPagoService {
  const repository: TipoPagoRepository = {
    findAll: (): Promise<readonly TipoPagoRecord[]> => Promise.resolve(tiposPago),

    findById: (id: number): Promise<TipoPagoRecord | null> =>
      Promise.resolve(
        tiposPago.find((tipoPago: TipoPagoRecord): boolean => tipoPago.id === id) ?? null,
      ),

    findEstadisticas: (
      query: TipoPagoEstadisticasRepositoryQuery,
    ): Promise<TipoPagoEstadisticasRepositoryResult> => {
      lastEstadisticasQuery = query;

      return Promise.resolve(estadisticasResult);
    },

    existsActiveBySlug: (slug: string, excludeId: number | null): Promise<boolean> =>
      Promise.resolve(
        tiposPago.some(
          (tipoPago: TipoPagoRecord): boolean =>
            tipoPago.id !== excludeId &&
            tipoPago.slug.toLocaleLowerCase('es-ES') === slug.toLocaleLowerCase('es-ES'),
        ),
      ),

    create: (command: CrearTipoPagoRecordCommand): Promise<TipoPagoRecord> => {
      lastCreateCommand = command;

      if (createError !== null) {
        return Promise.reject(createError);
      }

      return Promise.resolve(
        createRecord({
          id: 10,
          publicId: 'tipo-pago-new',
          nombre: command.nombre,
          slug: command.slug,
          fotoRelativePath: command.nuevoLogo.relativePath,
          afectaCaja: command.afectaCaja,
          orden: 2,
          fisico: command.fisico,
        }),
      );
    },

    update: (id: number, command: ActualizarTipoPagoRecordCommand): Promise<TipoPagoRecord> => {
      lastUpdateId = id;

      lastUpdateCommand = command;

      if (updateError !== null) {
        return Promise.reject(updateError);
      }

      const current: TipoPagoRecord | undefined = tiposPago.find(
        (tipoPago: TipoPagoRecord): boolean => tipoPago.id === id,
      );

      if (current === undefined) {
        return Promise.reject(new Error('Tipo de pago inexistente.'));
      }

      return Promise.resolve({
        ...current,
        nombre: command.nombre,
        slug: command.slug,
        afectaCaja: command.afectaCaja,
        fisico: command.fisico,
        fotoRelativePath: command.nuevoLogo?.relativePath ?? current.fotoRelativePath,
      });
    },

    reorder: (ids: readonly number[]): Promise<readonly TipoPagoRecord[]> => {
      lastReorderIds = [...ids];

      const orderById: ReadonlyMap<number, number> = new Map<number, number>(
        ids.map((id: number, index: number): readonly [number, number] => [id, index + 1]),
      );

      tiposPago = tiposPago
        .map((tipoPago: TipoPagoRecord): TipoPagoRecord => {
          if (tipoPago.slug.toLocaleLowerCase('es-ES') === 'efectivo') {
            return {
              ...tipoPago,
              orden: 0,
            };
          }

          return {
            ...tipoPago,
            orden: orderById.get(tipoPago.id) ?? tipoPago.orden,
          };
        })
        .sort(
          (first: TipoPagoRecord, second: TipoPagoRecord): number => first.orden - second.orden,
        );

      return Promise.resolve(tiposPago);
    },

    deactivate: (id: number): Promise<void> => {
      lastDeactivateId = id;

      return Promise.resolve();
    },
  };

  return new TiposPagoService(repository, new FakeAssetUrlBuilder(), promoter, discarder);
}

function createRecord(overrides: Partial<TipoPagoRecord> = {}): TipoPagoRecord {
  return {
    id: 1,
    publicId: 'tipo-pago-efectivo',
    nombre: 'Efectivo',
    slug: 'efectivo',
    fotoRelativePath: null,
    afectaCaja: true,
    orden: 0,
    fisico: true,
    ...overrides,
  };
}

function createInterface(overrides: Partial<TipoPagoInterface> = {}): TipoPagoInterface {
  return {
    id: 1,
    publicId: 'tipo-pago-efectivo',
    nombre: 'Efectivo',
    slug: 'efectivo',
    foto: null,
    afectaCaja: true,
    orden: 0,
    fisico: true,
    ...overrides,
  };
}
