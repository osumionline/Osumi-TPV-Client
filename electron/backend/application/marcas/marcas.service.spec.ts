import MarcasService from '@backend/application/marcas/marcas.service';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type { MarcaEstadisticasRepositoryResult } from '@backend/domain/marcas/marca-estadisticas-record.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let marcas: readonly MarcaRecord[];
let existingNames: ReadonlySet<string>;
let lastExcludedId: number | null;
let lastCreateCommand: CrearMarcaRecordCommand | null;
let lastUpdateId: number | null;
let lastUpdateCommand: ActualizarMarcaRecordCommand | null;
let lastDeactivateId: number | null;
let createError: Error | null;
let updateError: Error | null;

class FakeImageAssetPromoter implements ImageAssetPromoter {
  readonly preparedRequests: {
    readonly stagingId: string;
    readonly purpose: ImageAssetPurpose;
  }[] = [];

  readonly rolledBackIds: string[] = [];

  /**
   * Simula la promoción de un logo staged.
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
        relativePath: `files/brands/file-${stagingId}.webp`,
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
  readonly discardedIds: string[] = [];
  error: Error | null = null;

  /**
   * Registra el descarte de un staging consumido.
   */
  discard(stagingId: string): Promise<void> {
    this.discardedIds.push(stagingId);

    return this.error === null ? Promise.resolve() : Promise.reject(this.error);
  }
}

describe('MarcasService', (): void => {
  beforeEach((): void => {
    marcas = [
      createMarcaRecord(),
      createMarcaRecord({
        id: 2,
        publicId: 'marca-2',
        nombre: 'Marca duplicada',
        fotoRelativePath: null,
      }),
    ];

    existingNames = new Set<string>();
    lastExcludedId = null;
    lastCreateCommand = null;
    lastUpdateId = null;
    lastUpdateCommand = null;
    lastDeactivateId = null;
    createError = null;
    updateError = null;
  });

  it('devuelve el maestro activo transformando la ruta del logo', async (): Promise<void> => {
    const service: MarcasService = createService();

    await expect(service.getAll()).resolves.toEqual([
      createMarcaInterface(),
      createMarcaInterface({
        id: 2,
        publicId: 'marca-2',
        nombre: 'Marca duplicada',
        foto: null,
      }),
    ]);
  });

  it('recupera una marca activa por id', async (): Promise<void> => {
    const service: MarcasService = createService();

    await expect(service.getById(1)).resolves.toEqual(createMarcaInterface());
    await expect(service.getById(999)).resolves.toBeNull();
  });

  it('rechaza identificadores inválidos antes de consultar el repository', async (): Promise<void> => {
    const service: MarcasService = createService();

    await expect(service.getById(0)).rejects.toThrow('El identificador de la marca no es válido.');

    await expect(service.deactivate(Number.NaN)).rejects.toThrow(
      'El identificador de la marca no es válido.',
    );

    expect(lastDeactivateId).toBeNull();
  });

  it('normaliza los datos al crear una marca', async (): Promise<void> => {
    const service: MarcasService = createService();

    const result: MarcaInterface = await service.create(
      createCreateCommand({
        nombre: '  Marca nueva  ',
        telefono: '  944000001  ',
        email: '  info@example.com  ',
        direccion: '  Dirección  ',
        web: '  https://example.com  ',
        observaciones: '   ',
        crearProveedor: true,
      }),
    );

    expect(lastCreateCommand).toEqual({
      nombre: 'Marca nueva',
      telefono: '944000001',
      email: 'info@example.com',
      direccion: 'Dirección',
      web: 'https://example.com',
      observaciones: null,
      crearProveedor: true,
      nuevoLogo: null,
    });

    expect(result.nombre).toBe('Marca nueva');
  });

  it('impide crear otra marca activa con el mismo nombre', async (): Promise<void> => {
    existingNames = new Set<string>(['marca existente']);

    const service: MarcasService = createService();

    await expect(
      service.create(
        createCreateCommand({
          nombre: 'Marca existente',
        }),
      ),
    ).rejects.toThrow('Ya existe una marca activa con ese nombre.');

    expect(lastCreateCommand).toBeNull();
  });

  it('rechaza un email inválido antes de persistir', async (): Promise<void> => {
    const service: MarcasService = createService();

    await expect(
      service.create(
        createCreateCommand({
          email: 'email-invalido',
        }),
      ),
    ).rejects.toThrow('El email indicado no tiene un formato válido.');

    expect(lastCreateCommand).toBeNull();
  });

  it('actualiza una marca normalizando sus datos', async (): Promise<void> => {
    const service: MarcasService = createService();

    const result: MarcaInterface = await service.update(
      1,
      createUpdateCommand({
        nombre: '  Nombre nuevo  ',
        telefono: '   ',
        observaciones: '  Observaciones nuevas  ',
      }),
    );

    expect(lastUpdateId).toBe(1);

    expect(lastUpdateCommand).toEqual({
      nombre: 'Nombre nuevo',
      telefono: null,
      email: 'actualizada@example.com',
      direccion: 'Dirección actualizada',
      web: 'https://actualizada.example.com',
      observaciones: 'Observaciones nuevas',
      logo: {
        action: 'keep',
      },
    });

    expect(result.nombre).toBe('Nombre nuevo');
  });

  it('permite editar otros datos si conserva el nombre de un duplicado legacy', async (): Promise<void> => {
    marcas = [
      createMarcaRecord({
        nombre: 'Marca duplicada',
      }),
      createMarcaRecord({
        id: 2,
        publicId: 'marca-2',
        nombre: 'Marca duplicada',
        fotoRelativePath: null,
      }),
    ];

    existingNames = new Set<string>(['marca duplicada']);

    const service: MarcasService = createService();

    await service.update(
      1,
      createUpdateCommand({
        nombre: 'MARCA DUPLICADA',
      }),
    );

    expect(lastExcludedId).toBeNull();
    expect(lastUpdateId).toBe(1);
  });

  it('impide renombrar una marca con el nombre de otra marca activa', async (): Promise<void> => {
    existingNames = new Set<string>(['otra marca']);

    const service: MarcasService = createService();

    await expect(
      service.update(
        1,
        createUpdateCommand({
          nombre: 'Otra Marca',
        }),
      ),
    ).rejects.toThrow('Ya existe una marca activa con ese nombre.');

    expect(lastExcludedId).toBe(1);
    expect(lastUpdateCommand).toBeNull();
  });

  it('rechaza la actualización de una marca inexistente', async (): Promise<void> => {
    const service: MarcasService = createService();

    await expect(service.update(999, createUpdateCommand())).rejects.toThrow(
      'La marca indicada no existe o ya no está activa.',
    );

    expect(lastUpdateCommand).toBeNull();
  });

  it('delega la baja lógica de una marca válida', async (): Promise<void> => {
    const service: MarcasService = createService();

    await service.deactivate(2);

    expect(lastDeactivateId).toBe(2);
  });

  it('crea una marca promocionando y consumiendo su logo staged', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();
    const service: MarcasService = createService(promoter, discarder);

    const result: MarcaInterface = await service.create(
      createCreateCommand({
        logoStagingId: ' staged-logo ',
      }),
    );

    expect(promoter.preparedRequests).toEqual([
      {
        stagingId: 'staged-logo',
        purpose: 'brand_image',
      },
    ]);

    expect(lastCreateCommand?.nuevoLogo).toMatchObject({
      purpose: 'brand_image',
      relativePath: 'files/brands/file-staged-logo.webp',
    });

    expect(discarder.discardedIds).toEqual(['staged-logo']);

    expect(result.foto).toBe('asset://files/brands/file-staged-logo.webp');
  });

  it('actualiza una marca conservando el logo si no se indica ninguna acción', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const service: MarcasService = createService(promoter);

    await service.update(1, createUpdateCommand());

    expect(lastUpdateCommand?.logo).toEqual({
      action: 'keep',
    });

    expect(promoter.preparedRequests).toHaveLength(0);
  });

  it('permite quitar el logo sin preparar una nueva imagen', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const service: MarcasService = createService(promoter);

    const result: MarcaInterface = await service.update(
      1,
      createUpdateCommand({
        logo: {
          action: 'remove',
        },
      }),
    );

    expect(lastUpdateCommand?.logo).toEqual({
      action: 'remove',
    });

    expect(promoter.preparedRequests).toHaveLength(0);
    expect(result.foto).toBeNull();
  });

  it('sustituye el logo promocionando y consumiendo el nuevo staging', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();
    const service: MarcasService = createService(promoter, discarder);

    const result: MarcaInterface = await service.update(
      1,
      createUpdateCommand({
        logo: {
          action: 'replace',
          stagingId: ' staged-replacement ',
        },
      }),
    );

    expect(promoter.preparedRequests).toEqual([
      {
        stagingId: 'staged-replacement',
        purpose: 'brand_image',
      },
    ]);

    expect(lastUpdateCommand?.logo).toEqual({
      action: 'replace',
      nuevoArchivo: expect.objectContaining({
        purpose: 'brand_image',
        relativePath: 'files/brands/file-staged-replacement.webp',
      }),
    });

    expect(discarder.discardedIds).toEqual(['staged-replacement']);

    expect(result.foto).toBe('asset://files/brands/file-staged-replacement.webp');
  });

  it('revierte el logo preparado si falla la creación de la marca', async (): Promise<void> => {
    createError = new Error('Database error');

    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();
    const service: MarcasService = createService(promoter, discarder);

    await expect(
      service.create(
        createCreateCommand({
          logoStagingId: 'staged-logo',
        }),
      ),
    ).rejects.toThrow('Database error');

    expect(promoter.rolledBackIds).toEqual(['staged-logo']);

    expect(discarder.discardedIds).toHaveLength(0);
  });

  it('revierte el logo preparado si falla la actualización de la marca', async (): Promise<void> => {
    updateError = new Error('Database error');

    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();
    const service: MarcasService = createService(promoter, discarder);

    await expect(
      service.update(
        1,
        createUpdateCommand({
          logo: {
            action: 'replace',
            stagingId: 'staged-replacement',
          },
        }),
      ),
    ).rejects.toThrow('Database error');

    expect(promoter.rolledBackIds).toEqual(['staged-replacement']);

    expect(discarder.discardedIds).toHaveLength(0);
  });

  it('no convierte en fallido un guardado confirmado si falla la limpieza del staging', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder();

    discarder.error = new Error('Staging cleanup error');

    const service: MarcasService = createService(promoter, discarder);

    await expect(
      service.create(
        createCreateCommand({
          logoStagingId: 'staged-logo',
        }),
      ),
    ).resolves.toMatchObject({
      nombre: 'Marca nueva',
      foto: 'asset://files/brands/file-staged-logo.webp',
    });

    expect(discarder.discardedIds).toEqual(['staged-logo']);

    expect(promoter.rolledBackIds).toHaveLength(0);
  });

  it('rechaza un identificador temporal vacío antes de preparar el logo', async (): Promise<void> => {
    const promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter();
    const service: MarcasService = createService(promoter);

    await expect(
      service.create(
        createCreateCommand({
          logoStagingId: '   ',
        }),
      ),
    ).rejects.toThrow('El identificador temporal del logo no es válido.');

    expect(promoter.preparedRequests).toHaveLength(0);
    expect(lastCreateCommand).toBeNull();
  });
});

/**
 * Construye el servicio con dobles controlados para cada test.
 */
function createService(
  promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter(),
  discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder(),
): MarcasService {
  const repository: MarcaRepository = {
    findAll: (): Promise<readonly MarcaRecord[]> => Promise.resolve(marcas),

    findById: (id: number): Promise<MarcaRecord | null> =>
      Promise.resolve(marcas.find((marca: MarcaRecord): boolean => marca.id === id) ?? null),

    /**
     * Devuelve unas estadísticas vacías para los tests
     * del servicio que no ejercitan este caso de uso.
     */
    findEstadisticas: (): Promise<MarcaEstadisticasRepositoryResult> =>
      Promise.resolve({
        years: [],
        items: [],
      }),

    existsActiveByName: (nombre: string, excludeId: number | null): Promise<boolean> => {
      lastExcludedId = excludeId;

      return Promise.resolve(existingNames.has(nombre.toLocaleLowerCase('es-ES')));
    },

    create: (command: CrearMarcaRecordCommand): Promise<MarcaRecord> => {
      lastCreateCommand = command;

      if (createError !== null) {
        return Promise.reject(createError);
      }

      return Promise.resolve(
        createMarcaRecord({
          id: 3,
          publicId: 'marca-3',
          nombre: command.nombre,
          direccion: command.direccion,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
          fotoRelativePath: command.nuevoLogo?.relativePath ?? null,
        }),
      );
    },

    update: (id: number, command: ActualizarMarcaRecordCommand): Promise<MarcaRecord> => {
      lastUpdateId = id;
      lastUpdateCommand = command;

      if (updateError !== null) {
        return Promise.reject(updateError);
      }

      const current: MarcaRecord | undefined = marcas.find(
        (marca: MarcaRecord): boolean => marca.id === id,
      );

      if (current === undefined) {
        return Promise.reject(new Error('Marca inexistente.'));
      }

      return Promise.resolve({
        ...current,
        nombre: command.nombre,
        telefono: command.telefono,
        email: command.email,
        direccion: command.direccion,
        web: command.web,
        observaciones: command.observaciones,
        fotoRelativePath: resolveUpdatedLogoRelativePath(current, command),
      });
    },

    deactivate: (id: number): Promise<void> => {
      lastDeactivateId = id;

      return Promise.resolve();
    },
  };

  const assetUrlBuilder: AssetUrlBuilder = {
    build: (relativePath: string | null): string | null =>
      relativePath === null ? null : `asset://${relativePath}`,
  };

  return new MarcasService(repository, assetUrlBuilder, promoter, discarder);
}

/**
 * Resuelve el logo que devolvería el repository fake
 * después de una actualización.
 */
function resolveUpdatedLogoRelativePath(
  current: MarcaRecord,
  command: ActualizarMarcaRecordCommand,
): string | null {
  switch (command.logo.action) {
    case 'keep':
      return current.fotoRelativePath;

    case 'remove':
      return null;

    case 'replace':
      return command.logo.nuevoArchivo.relativePath;
  }
}

/**
 * Construye una Marca de dominio representativa.
 */
function createMarcaRecord(overrides: Partial<MarcaRecord> = {}): MarcaRecord {
  return {
    id: 1,
    publicId: 'marca-1',
    nombre: 'Marca existente',
    direccion: 'Dirección original',
    fotoRelativePath: 'files/brands/marca-1.webp',
    telefono: '944000000',
    email: 'info@existente.example.com',
    web: 'https://existente.example.com',
    observaciones: 'Observaciones originales',
    ...overrides,
  };
}

/**
 * Construye el contrato público esperado de una Marca.
 */
function createMarcaInterface(overrides: Partial<MarcaInterface> = {}): MarcaInterface {
  return {
    id: 1,
    publicId: 'marca-1',
    nombre: 'Marca existente',
    direccion: 'Dirección original',
    foto: 'asset://files/brands/marca-1.webp',
    telefono: '944000000',
    email: 'info@existente.example.com',
    web: 'https://existente.example.com',
    observaciones: 'Observaciones originales',
    ...overrides,
  };
}

/**
 * Construye un command de alta de Marca.
 */
function createCreateCommand(overrides: Partial<CrearMarcaCommand> = {}): CrearMarcaCommand {
  return {
    nombre: 'Marca nueva',
    telefono: null,
    email: null,
    direccion: null,
    web: null,
    observaciones: null,
    crearProveedor: false,
    ...overrides,
  };
}

/**
 * Construye un command de actualización de Marca.
 */
function createUpdateCommand(
  overrides: Partial<ActualizarMarcaCommand> = {},
): ActualizarMarcaCommand {
  return {
    nombre: 'Marca actualizada',
    telefono: '944999999',
    email: 'actualizada@example.com',
    direccion: 'Dirección actualizada',
    web: 'https://actualizada.example.com',
    observaciones: 'Observaciones actualizadas',
    ...overrides,
  };
}
