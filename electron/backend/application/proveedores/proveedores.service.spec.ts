import ProveedoresService from '@backend/application/proveedores/proveedores.service';
import type ActualizarProveedorRecordCommand from '@backend/contracts/proveedores/actualizar-proveedor-record-command.interface';
import type CrearProveedorRecordCommand from '@backend/contracts/proveedores/crear-proveedor-record-command.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
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
});

/**
 * Construye el servicio con dobles controlados
 * para cada test.
 */
function createService(): ProveedoresService {
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
          fotoRelativePath: null,
          marcas: [...command.idsMarcas],
          comerciales: [],
        }),
      );
    },

    update: (id: number, command: ActualizarProveedorRecordCommand): Promise<ProveedorRecord> => {
      lastUpdateId = id;
      lastUpdateCommand = command;

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
        marcas: [...command.idsMarcas],
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

  return new ProveedoresService(repository, assetUrlBuilder);
}

/**
 * Construye un proveedor de dominio representativo.
 */
function createProveedorRecord(overrides: Partial<ProveedorRecord> = {}): ProveedorRecord {
  return {
    id: 1,
    publicId: 'proveedor-1',
    nombre: 'Proveedor existente',
    fotoRelativePath: 'files/brands/proveedor-1.webp',
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
    foto: 'asset://files/brands/proveedor-1.webp',
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
