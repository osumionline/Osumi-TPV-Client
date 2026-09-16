import ProveedoresService from '@backend/application/proveedores/proveedores.service';
import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageDiscarder from '@backend/contracts/files/staged-image-discarder.interface';
import type ActualizarComercialRecordCommand from '@backend/contracts/proveedores/actualizar-comercial-record-command.interface';
import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearComercialRecordCommand from '@backend/contracts/proveedores/crear-comercial-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type { ImageAssetPurpose } from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import type ActualizarComercialCommand from '@desktop-contracts/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/proveedores/proveedor.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let proveedores: readonly ProveedorRecord[];
let existingNames: ReadonlySet<string>;
let lastNameCheck: {
  readonly nombre: string;
  readonly excludeId: number | null;
} | null;
let lastCreateCommand: CrearProveedorRecordCommand | null;
let lastUpdateId: number | null;
let lastUpdateCommand: ActualizarProveedorRecordCommand | null;
let lastDeactivateId: number | null;
let createError: Error | null;
let updateError: Error | null;
let lastCreateComercialCommand: CrearComercialRecordCommand | null;
let lastUpdateComercial: {
  readonly idProveedor: number;
  readonly idComercial: number;
  readonly command: ActualizarComercialRecordCommand;
} | null;
let lastDeactivateComercial: {
  readonly idProveedor: number;
  readonly idComercial: number;
} | null;

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
        relativePath: `files/providers/file-${stagingId}.webp`,
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

describe('ProveedoresService', (): void => {
  beforeEach((): void => {
    proveedores = [
      createProveedorRecord(),
      createProveedorRecord({
        id: 2,
        publicId: 'proveedor-2',
        nombre: 'Proveedor secundario',
        fotoRelativePath: null,
        marcas: [2],
        comerciales: [],
      }),
    ];

    existingNames = new Set<string>();

    lastNameCheck = null;
    lastCreateCommand = null;
    lastUpdateId = null;
    lastUpdateCommand = null;
    lastDeactivateId = null;
    createError = null;
    updateError = null;
    lastCreateComercialCommand = null;
    lastUpdateComercial = null;
    lastDeactivateComercial = null;
  });

  it('devuelve el maestro activo transformando la foto y los comerciales', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.getAll()).resolves.toEqual([
      createProveedorInterface(),
      createProveedorInterface({
        id: 2,
        publicId: 'proveedor-2',
        nombre: 'Proveedor secundario',
        foto: null,
        marcas: [2],
        comerciales: [],
      }),
    ]);
  });

  it('recupera un proveedor activo por id y devuelve null si no existe', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.getById(1)).resolves.toEqual(createProveedorInterface());
    await expect(service.getById(999)).resolves.toBeNull();
  });

  it('rechaza identificadores inválidos antes de acceder al repository', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.getById(0)).rejects.toThrow(
      'El identificador del proveedor no es válido.',
    );
    await expect(service.deactivate(Number.NaN)).rejects.toThrow(
      'El identificador del proveedor no es válido.',
    );
    expect(lastDeactivateId).toBeNull();
  });

  it('normaliza el alta y elimina identificadores de marca repetidos', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    const result: ProveedorInterface = await service.create(
      createCreateCommand({
        nombre: '  Proveedor nuevo  ',
        direccion: '  Nueva dirección  ',
        telefono: '  944000010  ',
        email: '  nuevo@example.com  ',
        web: '  https://nuevo.example.com  ',
        observaciones: '   ',
        idsMarcas: [2, 1, 2, 1],
      }),
    );

    expect(lastNameCheck).toEqual({
      nombre: 'Proveedor nuevo',
      excludeId: null,
    });
    expect(lastCreateCommand).toEqual({
      nombre: 'Proveedor nuevo',
      direccion: 'Nueva dirección',
      telefono: '944000010',
      email: 'nuevo@example.com',
      web: 'https://nuevo.example.com',
      observaciones: null,
      idsMarcas: [2, 1],
      nuevoLogo: null,
    });
    expect(result).toMatchObject({
      id: 3,
      nombre: 'Proveedor nuevo',
      marcas: [2, 1],
    });
  });

  it('impide crear otro proveedor activo con el mismo nombre', async (): Promise<void> => {
    existingNames = new Set<string>(['proveedor existente']);

    const service: ProveedoresService = createService();

    await expect(
      service.create(
        createCreateCommand({
          nombre: '  Proveedor Existente  ',
        }),
      ),
    ).rejects.toThrow('Ya existe un proveedor activo con ese nombre.');

    expect(lastNameCheck).toEqual({
      nombre: 'Proveedor Existente',
      excludeId: null,
    });
    expect(lastCreateCommand).toBeNull();
  });

  it('rechaza datos inválidos antes de crear el proveedor', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(
      service.create(
        createCreateCommand({
          email: 'email-invalido',
        }),
      ),
    ).rejects.toThrow('El email indicado no tiene un formato válido.');
    await expect(
      service.create(
        createCreateCommand({
          idsMarcas: [1, 0],
        }),
      ),
    ).rejects.toThrow('Una de las marcas seleccionadas no es válida.');
    expect(lastCreateCommand).toBeNull();
  });

  it('actualiza un proveedor normalizando los datos y comprobando el nuevo nombre', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    const result: ProveedorInterface = await service.update(
      1,
      createUpdateCommand({
        nombre: '  Proveedor actualizado  ',
        direccion: '  Dirección actualizada  ',
        telefono: '   ',
        email: '  actualizado@example.com  ',
        web: '  https://actualizado.example.com  ',
        observaciones: '  Nuevas observaciones  ',
        idsMarcas: [2, 2, 1],
        logo: {
          action: 'keep',
        },
      }),
    );

    expect(lastNameCheck).toEqual({
      nombre: 'Proveedor actualizado',
      excludeId: 1,
    });
    expect(lastUpdateId).toBe(1);
    expect(lastUpdateCommand).toEqual({
      nombre: 'Proveedor actualizado',
      direccion: 'Dirección actualizada',
      telefono: null,
      email: 'actualizado@example.com',
      web: 'https://actualizado.example.com',
      observaciones: 'Nuevas observaciones',
      idsMarcas: [2, 1],
      logo: {
        action: 'keep',
      },
    });
    expect(result).toMatchObject({
      id: 1,
      nombre: 'Proveedor actualizado',
      marcas: [2, 1],
    });
  });

  it('permite editar otros datos conservando un nombre duplicado legacy', async (): Promise<void> => {
    proveedores = [
      createProveedorRecord({
        nombre: 'Proveedor duplicado',
      }),
      createProveedorRecord({
        id: 2,
        publicId: 'proveedor-2',
        nombre: 'Proveedor duplicado',
        fotoRelativePath: null,
        marcas: [],
        comerciales: [],
      }),
    ];

    existingNames = new Set<string>(['proveedor duplicado']);

    const service: ProveedoresService = createService();

    await service.update(
      1,
      createUpdateCommand({
        nombre: 'PROVEEDOR DUPLICADO',
      }),
    );

    expect(lastNameCheck).toBeNull();
    expect(lastUpdateId).toBe(1);
  });

  it('impide renombrar un proveedor con el nombre de otro proveedor activo', async (): Promise<void> => {
    existingNames = new Set<string>(['otro proveedor']);

    const service: ProveedoresService = createService();

    await expect(
      service.update(
        1,
        createUpdateCommand({
          nombre: 'Otro Proveedor',
        }),
      ),
    ).rejects.toThrow('Ya existe un proveedor activo con ese nombre.');
    expect(lastNameCheck).toEqual({
      nombre: 'Otro Proveedor',
      excludeId: 1,
    });
    expect(lastUpdateCommand).toBeNull();
  });

  it('rechaza la actualización de un proveedor inexistente', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.update(999, createUpdateCommand())).rejects.toThrow(
      'El proveedor indicado no existe o ya no está activo.',
    );
    expect(lastUpdateCommand).toBeNull();
  });

  it('delega la baja lógica de un proveedor válido', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await service.deactivate(2);

    expect(lastDeactivateId).toBe(2);
  });

  it('crea un proveedor promocionando y consumiendo su logo staged', async (): Promise<void> => {
    const promoter = new FakeImageAssetPromoter();
    const discarder = new FakeStagedImageDiscarder();

    const service: ProveedoresService = createService(promoter, discarder);

    const result: ProveedorInterface = await service.create(
      createCreateCommand({
        logoStagingId: ' staged-logo ',
      }),
    );

    expect(promoter.preparedRequests).toEqual([
      {
        stagingId: 'staged-logo',
        purpose: 'provider_image',
      },
    ]);

    expect(lastCreateCommand?.nuevoLogo).toMatchObject({
      purpose: 'provider_image',
      relativePath: 'files/providers/file-staged-logo.webp',
    });

    expect(discarder.discardedIds).toEqual(['staged-logo']);

    expect(result.foto).toBe('asset://files/providers/file-staged-logo.webp');
  });

  it('actualiza un proveedor conservando el logo por defecto', async (): Promise<void> => {
    const promoter = new FakeImageAssetPromoter();

    const service: ProveedoresService = createService(promoter);

    await service.update(1, createUpdateCommand());

    expect(lastUpdateCommand?.logo).toEqual({
      action: 'keep',
    });

    expect(promoter.preparedRequests).toHaveLength(0);
  });

  it('permite quitar el logo sin preparar una nueva imagen', async (): Promise<void> => {
    const promoter = new FakeImageAssetPromoter();

    const service: ProveedoresService = createService(promoter);

    const result: ProveedorInterface = await service.update(
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
    const promoter = new FakeImageAssetPromoter();

    const discarder = new FakeStagedImageDiscarder();

    const service: ProveedoresService = createService(promoter, discarder);

    const result: ProveedorInterface = await service.update(
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
        purpose: 'provider_image',
      },
    ]);

    expect(lastUpdateCommand?.logo).toEqual({
      action: 'replace',
      nuevoArchivo: expect.objectContaining({
        purpose: 'provider_image',
        relativePath: 'files/providers/file-staged-replacement.webp',
      }),
    });

    expect(discarder.discardedIds).toEqual(['staged-replacement']);

    expect(result.foto).toBe('asset://files/providers/file-staged-replacement.webp');
  });

  it('revierte el logo preparado si falla la creación del proveedor', async (): Promise<void> => {
    createError = new Error('Database error');

    const promoter = new FakeImageAssetPromoter();

    const discarder = new FakeStagedImageDiscarder();

    const service: ProveedoresService = createService(promoter, discarder);

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

  it('revierte el logo preparado si falla la actualización del proveedor', async (): Promise<void> => {
    updateError = new Error('Database error');

    const promoter = new FakeImageAssetPromoter();

    const discarder = new FakeStagedImageDiscarder();

    const service: ProveedoresService = createService(promoter, discarder);

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
    const promoter = new FakeImageAssetPromoter();

    const discarder = new FakeStagedImageDiscarder();

    discarder.error = new Error('Staging cleanup error');

    const service: ProveedoresService = createService(promoter, discarder);

    await expect(
      service.create(
        createCreateCommand({
          logoStagingId: 'staged-logo',
        }),
      ),
    ).resolves.toMatchObject({
      nombre: 'Proveedor nuevo',
      foto: 'asset://files/providers/file-staged-logo.webp',
    });

    expect(discarder.discardedIds).toEqual(['staged-logo']);

    expect(promoter.rolledBackIds).toHaveLength(0);
  });

  it('rechaza un identificador temporal vacío antes de preparar el logo', async (): Promise<void> => {
    const promoter = new FakeImageAssetPromoter();

    const service: ProveedoresService = createService(promoter);

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

  it('crea un Comercial normalizando sus campos y asociándolo al Proveedor', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    const command: CrearComercialCommand = {
      nombre: '  Comercial nuevo  ',
      telefono: '  600111222  ',
      email: '  comercial@empresa.test  ',
      observaciones: '   ',
    };

    const result: ComercialInterface = await service.createComercial(1, command);

    expect(lastCreateComercialCommand).toEqual({
      idProveedor: 1,
      nombre: 'Comercial nuevo',
      telefono: '600111222',
      email: 'comercial@empresa.test',
      observaciones: null,
    });

    expect(result).toEqual({
      id: 20,
      publicId: 'comercial-20',
      idProveedor: 1,
      nombre: 'Comercial nuevo',
      telefono: '600111222',
      email: 'comercial@empresa.test',
      observaciones: null,
    });
  });

  it('valida Nombre, email e identificador del Proveedor al crear un Comercial', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.createComercial(0, createComercialCommand())).rejects.toThrow(
      'El identificador del proveedor no es válido.',
    );

    await expect(
      service.createComercial(
        1,
        createComercialCommand({
          nombre: '   ',
        }),
      ),
    ).rejects.toThrow('El nombre del comercial no puede estar vacío.');

    await expect(
      service.createComercial(
        1,
        createComercialCommand({
          email: 'email-invalido',
        }),
      ),
    ).rejects.toThrow('El email indicado no tiene un formato válido.');

    expect(lastCreateComercialCommand).toBeNull();
  });

  it('actualiza un Comercial conservando su pertenencia al Proveedor', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    const result: ComercialInterface = await service.updateComercial(1, 10, {
      nombre: '  Comercial renovado  ',
      telefono: '   ',
      email: ' renovado@example.com ',
      observaciones: '  Nueva nota  ',
    });

    expect(lastUpdateComercial).toEqual({
      idProveedor: 1,
      idComercial: 10,
      command: {
        nombre: 'Comercial renovado',
        telefono: null,
        email: 'renovado@example.com',
        observaciones: 'Nueva nota',
      },
    });

    expect(result).toMatchObject({
      id: 10,
      publicId: 'comercial-10',
      idProveedor: 1,
      nombre: 'Comercial renovado',
    });
  });

  it('rechaza identificadores inválidos al modificar un Comercial', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.updateComercial(0, 10, createUpdateComercialCommand())).rejects.toThrow(
      'El identificador del proveedor no es válido.',
    );

    await expect(service.updateComercial(1, 0, createUpdateComercialCommand())).rejects.toThrow(
      'El identificador del comercial no es válido.',
    );

    expect(lastUpdateComercial).toBeNull();
  });

  it('no permite actualizar un Comercial desde otro Proveedor', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await expect(service.updateComercial(2, 10, createUpdateComercialCommand())).rejects.toThrow(
      'Comercial inexistente.',
    );
  });

  it('da de baja el Comercial dentro del contexto de su Proveedor', async (): Promise<void> => {
    const service: ProveedoresService = createService();

    await service.deactivateComercial(1, 10);

    expect(lastDeactivateComercial).toEqual({
      idProveedor: 1,
      idComercial: 10,
    });
  });
});

/**
 * Construye el servicio con dobles controlados
 * para cada test.
 */
function createService(
  promoter: FakeImageAssetPromoter = new FakeImageAssetPromoter(),
  discarder: FakeStagedImageDiscarder = new FakeStagedImageDiscarder(),
): ProveedoresService {
  const repository: ProveedorRepository = {
    findAll: (): Promise<readonly ProveedorRecord[]> => Promise.resolve(proveedores),

    findById: (id: number): Promise<ProveedorRecord | null> =>
      Promise.resolve(
        proveedores.find((proveedor: ProveedorRecord): boolean => proveedor.id === id) ?? null,
      ),

    existsActiveByName: (nombre: string, excludeId: number | null): Promise<boolean> => {
      lastNameCheck = {
        nombre,
        excludeId,
      };

      return Promise.resolve(existingNames.has(nombre.toLocaleLowerCase('es-ES')));
    },

    create: (command: CrearProveedorRecordCommand): Promise<ProveedorRecord> => {
      lastCreateCommand = command;

      if (createError !== null) {
        return Promise.reject(createError);
      }

      return Promise.resolve(
        createProveedorRecord({
          id: 3,
          publicId: 'proveedor-3',
          nombre: command.nombre,
          direccion: command.direccion,
          telefono: command.telefono,
          email: command.email,
          web: command.web,
          observaciones: command.observaciones,
          fotoRelativePath: command.nuevoLogo?.relativePath ?? null,
          marcas: [...command.idsMarcas],
          comerciales: [],
        }),
      );
    },

    update: (id: number, command: ActualizarProveedorRecordCommand): Promise<ProveedorRecord> => {
      lastUpdateId = id;
      lastUpdateCommand = command;

      if (updateError !== null) {
        return Promise.reject(updateError);
      }

      const current: ProveedorRecord | undefined = proveedores.find(
        (proveedor: ProveedorRecord): boolean => proveedor.id === id,
      );

      if (current === undefined) {
        return Promise.reject(new Error('Proveedor inexistente.'));
      }

      return Promise.resolve({
        ...current,
        nombre: command.nombre,
        direccion: command.direccion,
        telefono: command.telefono,
        email: command.email,
        web: command.web,
        observaciones: command.observaciones,
        fotoRelativePath: resolveUpdatedLogoRelativePath(current, command),
        marcas: [...command.idsMarcas],
      });
    },

    deactivate: (id: number): Promise<void> => {
      lastDeactivateId = id;

      return Promise.resolve();
    },

    createComercial: (command: CrearComercialRecordCommand): Promise<ComercialRecord> => {
      lastCreateComercialCommand = command;

      return Promise.resolve({
        id: 20,
        publicId: 'comercial-20',
        idProveedor: command.idProveedor,
        nombre: command.nombre,
        telefono: command.telefono,
        email: command.email,
        observaciones: command.observaciones,
      });
    },

    updateComercial: (
      idProveedor: number,
      idComercial: number,
      command: ActualizarComercialRecordCommand,
    ): Promise<ComercialRecord> => {
      lastUpdateComercial = {
        idProveedor,
        idComercial,
        command,
      };

      const current: ComercialRecord | undefined = proveedores
        .flatMap((proveedor: ProveedorRecord): readonly ComercialRecord[] => proveedor.comerciales)
        .find(
          (comercial: ComercialRecord): boolean =>
            comercial.id === idComercial && comercial.idProveedor === idProveedor,
        );

      if (current === undefined) {
        return Promise.reject(new Error('Comercial inexistente.'));
      }

      return Promise.resolve({
        ...current,
        ...command,
      });
    },

    deactivateComercial: (idProveedor: number, idComercial: number): Promise<void> => {
      lastDeactivateComercial = {
        idProveedor,
        idComercial,
      };

      return Promise.resolve();
    },
  };

  const assetUrlBuilder: AssetUrlBuilder = {
    build: (relativePath: string | null): string | null =>
      relativePath === null ? null : `asset://${relativePath}`,
  };

  return new ProveedoresService(repository, assetUrlBuilder, promoter, discarder);
}

/**
 * Construye un proveedor de dominio representativo.
 */
function createProveedorRecord(overrides: Partial<ProveedorRecord> = {}): ProveedorRecord {
  return {
    id: 1,
    publicId: 'proveedor-1',
    nombre: 'Proveedor existente',
    fotoRelativePath: 'files/providers/proveedor-1.webp',
    direccion: 'Dirección original',
    telefono: '944000001',
    email: 'proveedor@example.com',
    web: 'https://proveedor.example.com',
    observaciones: 'Observaciones originales',
    marcas: [1, 2],
    comerciales: [
      {
        id: 10,
        publicId: 'comercial-10',
        idProveedor: 1,
        nombre: 'Comercial activo',
        telefono: '600000001',
        email: 'comercial@example.com',
        observaciones: 'Observaciones comercial',
      },
    ],
    ...overrides,
  };
}

/**
 * Construye el contrato público esperado.
 */
function createProveedorInterface(overrides: Partial<ProveedorInterface> = {}): ProveedorInterface {
  return {
    id: 1,
    publicId: 'proveedor-1',
    nombre: 'Proveedor existente',
    foto: 'asset://files/providers/proveedor-1.webp',
    direccion: 'Dirección original',
    telefono: '944000001',
    email: 'proveedor@example.com',
    web: 'https://proveedor.example.com',
    observaciones: 'Observaciones originales',
    marcas: [1, 2],
    comerciales: [
      {
        id: 10,
        publicId: 'comercial-10',
        idProveedor: 1,
        nombre: 'Comercial activo',
        telefono: '600000001',
        email: 'comercial@example.com',
        observaciones: 'Observaciones comercial',
      },
    ],
    ...overrides,
  };
}

/**
 * Construye un command de alta de proveedor.
 */
function createCreateCommand(
  overrides: Partial<CrearProveedorCommand> = {},
): CrearProveedorCommand {
  return {
    nombre: 'Proveedor nuevo',
    direccion: null,
    email: null,
    web: null,
    telefono: null,
    observaciones: null,
    idsMarcas: [],
    ...overrides,
  };
}

/**
 * Construye un command de actualización.
 */
function createUpdateCommand(
  overrides: Partial<ActualizarProveedorCommand> = {},
): ActualizarProveedorCommand {
  return {
    nombre: 'Proveedor actualizado',
    direccion: 'Dirección actualizada',
    email: 'actualizado@example.com',
    web: 'https://actualizado.example.com',
    telefono: '944999999',
    observaciones: 'Observaciones actualizadas',
    idsMarcas: [2],
    ...overrides,
  };
}

/**
 * Resuelve el logo que devolvería el repository fake
 * después de una actualización.
 */
function resolveUpdatedLogoRelativePath(
  current: ProveedorRecord,
  command: ActualizarProveedorRecordCommand,
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

function createComercialCommand(
  overrides: Partial<CrearComercialCommand> = {},
): CrearComercialCommand {
  return {
    nombre: 'Comercial nuevo',
    telefono: null,
    email: null,
    observaciones: null,
    ...overrides,
  };
}

function createUpdateComercialCommand(
  overrides: Partial<ActualizarComercialCommand> = {},
): ActualizarComercialCommand {
  return {
    nombre: 'Comercial actualizado',
    telefono: null,
    email: null,
    observaciones: null,
    ...overrides,
  };
}
