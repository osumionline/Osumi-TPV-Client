import { TestBed } from '@angular/core/testing';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type ActualizarComercialCommand from '@desktop-contracts/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/proveedores/proveedor.interface';
import type ProveedorWorkspace from '@model/proveedores/proveedor-workspace.interface';
import Proveedor from '@model/proveedores/proveedor.model';
import FilesService from '@services/application/files.service';
import ProveedoresService from '@services/compras/proveedores.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: ProveedoresService;
let originalDesktopDescriptor: PropertyDescriptor | undefined;

let getAllCalls: number;
let getAllResult: readonly ProveedorInterface[];
let getAllPromise: Promise<readonly ProveedorInterface[]> | null;

let createCalls: CrearProveedorCommand[];
let createResult: ProveedorInterface;
let createError: Error | null;

let updateCalls: {
  readonly id: number;
  readonly command: ActualizarProveedorCommand;
}[];
let updateResult: ProveedorInterface;
let updateError: Error | null;

let deactivateCalls: number[];
let deactivateError: Error | null;
let filesService: FakeFilesService;

let createComercialCalls: {
  readonly idProveedor: number;
  readonly command: CrearComercialCommand;
}[];

let createComercialResult: ComercialInterface;
let createComercialError: Error | null;

let updateComercialCalls: {
  readonly idProveedor: number;
  readonly idComercial: number;
  readonly command: ActualizarComercialCommand;
}[];

let updateComercialResult: ComercialInterface;
let updateComercialError: Error | null;

let deactivateComercialCalls: {
  readonly idProveedor: number;
  readonly idComercial: number;
}[];

let deactivateComercialError: Error | null;

describe('ProveedoresService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    getAllCalls = 0;
    getAllResult = [];
    getAllPromise = null;

    createCalls = [];
    createResult = createProveedorInterface(20, 'proveedor-20', 'Proveedor nuevo');
    createError = null;

    updateCalls = [];
    updateResult = createProveedorInterface(12, 'proveedor-12', 'Proveedor actualizado');
    updateError = null;

    deactivateCalls = [];
    deactivateError = null;
    filesService = new FakeFilesService();

    createComercialCalls = [];
    createComercialResult = createComercialInterface(121, 'comercial-121', 12, 'Comercial nuevo');
    createComercialError = null;

    updateComercialCalls = [];
    updateComercialResult = createComercialInterface(
      120,
      'comercial-12',
      12,
      'Comercial actualizado',
    );
    updateComercialError = null;

    deactivateComercialCalls = [];
    deactivateComercialError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        proveedores: {
          getAll: (): Promise<readonly ProveedorInterface[]> => {
            getAllCalls++;

            return getAllPromise ?? Promise.resolve(getAllResult);
          },

          getById: (): Promise<ProveedorInterface | null> => Promise.resolve(null),

          create: (command: CrearProveedorCommand): Promise<ProveedorInterface> => {
            createCalls.push(command);

            return createError === null
              ? Promise.resolve(createResult)
              : Promise.reject(createError);
          },

          update: (
            id: number,
            command: ActualizarProveedorCommand,
          ): Promise<ProveedorInterface> => {
            updateCalls.push({
              id,
              command,
            });

            return updateError === null
              ? Promise.resolve(updateResult)
              : Promise.reject(updateError);
          },

          deactivate: (id: number): Promise<void> => {
            deactivateCalls.push(id);

            return deactivateError === null ? Promise.resolve() : Promise.reject(deactivateError);
          },

          createComercial: (
            idProveedor: number,
            command: CrearComercialCommand,
          ): Promise<ComercialInterface> => {
            createComercialCalls.push({
              idProveedor,
              command,
            });

            return createComercialError === null
              ? Promise.resolve(createComercialResult)
              : Promise.reject(createComercialError);
          },

          updateComercial: (
            idProveedor: number,
            idComercial: number,
            command: ActualizarComercialCommand,
          ): Promise<ComercialInterface> => {
            updateComercialCalls.push({
              idProveedor,
              idComercial,
              command,
            });

            return updateComercialError === null
              ? Promise.resolve(updateComercialResult)
              : Promise.reject(updateComercialError);
          },

          deactivateComercial: (idProveedor: number, idComercial: number): Promise<void> => {
            deactivateComercialCalls.push({
              idProveedor,
              idComercial,
            });

            return deactivateComercialError === null
              ? Promise.resolve()
              : Promise.reject(deactivateComercialError);
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        ProveedoresService,
        {
          provide: FilesService,
          useValue: filesService,
        },
      ],
    });

    service = TestBed.inject(ProveedoresService);
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('carga el maestro una sola vez mientras siga marcado como cargado', async (): Promise<void> => {
    getAllResult = [
      createProveedorInterface(1, 'proveedor-1', 'Proveedor uno'),
      createProveedorInterface(2, 'proveedor-2', 'Proveedor dos'),
    ];

    await service.load();
    await service.load();

    expect(getAllCalls).toBe(1);
    expect(service.loaded()).toBe(true);

    expect(service.proveedores().map((proveedor: Proveedor): string => proveedor.nombre)).toEqual([
      'Proveedor uno',
      'Proveedor dos',
    ]);
  });

  it('reload fuerza una nueva carga del maestro', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(1, 'proveedor-1', 'Proveedor inicial')];

    await service.load();

    getAllResult = [createProveedorInterface(2, 'proveedor-2', 'Proveedor recargado')];

    await service.reload();

    expect(getAllCalls).toBe(2);

    expect(service.proveedores().map((proveedor: Proveedor): string => proveedor.nombre)).toEqual([
      'Proveedor recargado',
    ]);
  });

  it('crea un proveedor, lo incorpora al maestro y mantiene el orden alfabético', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(10, 'proveedor-10', 'Zeta Distribuciones')];

    await service.load();

    createResult = createProveedorInterface(20, 'proveedor-20', 'Alfa Comercial');

    const command: CrearProveedorCommand = createCreateCommand({
      nombre: 'Alfa Comercial',
      idsMarcas: [1, 2],
    });

    const proveedor: Proveedor = await service.create(command);

    expect(createCalls).toEqual([command]);

    expect(proveedor).toBeInstanceOf(Proveedor);
    expect(proveedor.id).toBe(20);
    expect(proveedor.publicId).toBe('proveedor-20');
    expect(proveedor.nombre).toBe('Alfa Comercial');

    expect(service.proveedores().map((item: Proveedor): string => item.nombre)).toEqual([
      'Alfa Comercial',
      'Zeta Distribuciones',
    ]);

    expect(service.findById(20)).toBe(proveedor);
    expect(service.findByPublicId('proveedor-20')).toBe(proveedor);
  });

  it('actualiza la instancia canónica sin duplicarla y recalcula su posición', async (): Promise<void> => {
    getAllResult = [
      createProveedorInterface(12, 'proveedor-12', 'Alfa Distribuciones'),
      createProveedorInterface(30, 'proveedor-30', 'Beta Comercial'),
    ];

    await service.load();

    updateResult = createProveedorInterface(12, 'proveedor-12', 'Zeta Distribuciones', {
      telefono: '944999999',
      marcas: [2, 3],
    });

    const command: ActualizarProveedorCommand = createUpdateCommand({
      nombre: 'Zeta Distribuciones',
      telefono: '944999999',
      idsMarcas: [2, 3],
    });

    const proveedor: Proveedor = await service.update(12, command);

    expect(updateCalls).toEqual([
      {
        id: 12,
        command,
      },
    ]);

    expect(proveedor.id).toBe(12);
    expect(proveedor.publicId).toBe('proveedor-12');
    expect(proveedor.nombre).toBe('Zeta Distribuciones');
    expect(proveedor.telefono).toBe('944999999');
    expect(proveedor.marcas).toEqual([2, 3]);

    expect(service.proveedores()).toHaveLength(2);

    expect(service.proveedores().map((item: Proveedor): string => item.nombre)).toEqual([
      'Beta Comercial',
      'Zeta Distribuciones',
    ]);

    expect(service.findByPublicId('proveedor-12')).toBe(proveedor);
  });

  it('da de baja un proveedor y lo elimina del maestro renderer', async (): Promise<void> => {
    getAllResult = [
      createProveedorInterface(12, 'proveedor-12', 'Proveedor eliminado'),
      createProveedorInterface(30, 'proveedor-30', 'Proveedor conservado'),
    ];

    await service.load();

    await service.deactivate(12);

    expect(deactivateCalls).toEqual([12]);

    expect(
      service.proveedores().map((proveedor: Proveedor): number | null => proveedor.id),
    ).toEqual([30]);

    expect(service.findById(12)).toBeNull();
    expect(service.findByPublicId('proveedor-12')).toBeNull();
  });

  it('una creación confirmada no queda pisada por una carga anterior todavía pendiente', async (): Promise<void> => {
    const deferred = createDeferred<readonly ProveedorInterface[]>();

    getAllPromise = deferred.promise;

    const loadPromise: Promise<void> = service.load();

    createResult = createProveedorInterface(20, 'proveedor-20', 'Proveedor nuevo');

    const createPromise: Promise<Proveedor> = service.create(
      createCreateCommand({
        nombre: 'Proveedor nuevo',
      }),
    );

    deferred.resolve([createProveedorInterface(10, 'proveedor-10', 'Proveedor antiguo')]);

    await loadPromise;

    const createdProveedor: Proveedor = await createPromise;

    expect(createdProveedor.nombre).toBe('Proveedor nuevo');

    expect(service.proveedores().map((proveedor: Proveedor): string => proveedor.nombre)).toEqual([
      'Proveedor antiguo',
      'Proveedor nuevo',
    ]);
  });

  it('una actualización confirmada prevalece sobre una carga anterior todavía pendiente', async (): Promise<void> => {
    const deferred = createDeferred<readonly ProveedorInterface[]>();

    getAllPromise = deferred.promise;

    const loadPromise: Promise<void> = service.load();

    updateResult = createProveedorInterface(12, 'proveedor-12', 'Proveedor actualizado');

    const updatePromise: Promise<Proveedor> = service.update(
      12,
      createUpdateCommand({
        nombre: 'Proveedor actualizado',
      }),
    );

    deferred.resolve([createProveedorInterface(12, 'proveedor-12', 'Proveedor antiguo')]);

    await loadPromise;
    await updatePromise;

    expect(service.proveedores()).toHaveLength(1);

    expect(service.findById(12)?.nombre).toBe('Proveedor actualizado');
  });

  it('una baja confirmada prevalece sobre una carga anterior todavía pendiente', async (): Promise<void> => {
    const deferred = createDeferred<readonly ProveedorInterface[]>();

    getAllPromise = deferred.promise;

    const loadPromise: Promise<void> = service.load();

    const deactivatePromise: Promise<void> = service.deactivate(12);

    deferred.resolve([
      createProveedorInterface(12, 'proveedor-12', 'Proveedor que ya no debe aparecer'),
      createProveedorInterface(30, 'proveedor-30', 'Proveedor conservado'),
    ]);

    await loadPromise;
    await deactivatePromise;

    expect(
      service.proveedores().map((proveedor: Proveedor): number | null => proveedor.id),
    ).toEqual([30]);
  });

  it('conserva el maestro si falla una actualización', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor original')];

    await service.load();

    const originalProveedor: Proveedor | null = service.findById(12);

    updateError = new Error('No se pudo actualizar.');

    await expect(
      service.update(
        12,
        createUpdateCommand({
          nombre: 'Proveedor modificado',
        }),
      ),
    ).rejects.toThrow('No se pudo actualizar.');

    expect(service.proveedores()).toEqual([originalProveedor]);

    expect(service.findById(12)?.nombre).toBe('Proveedor original');
  });

  it('conserva el maestro si falla una baja', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor original')];

    await service.load();

    deactivateError = new Error('No se pudo eliminar.');

    await expect(service.deactivate(12)).rejects.toThrow('No se pudo eliminar.');

    expect(service.proveedores()).toHaveLength(1);
    expect(service.findById(12)?.nombre).toBe('Proveedor original');
  });

  it('clear vacía el maestro y permite volver a cargarlo', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor original')];

    await service.load();

    service.clear();

    expect(service.proveedores()).toEqual([]);
    expect(service.loaded()).toBe(false);

    getAllResult = [createProveedorInterface(30, 'proveedor-30', 'Proveedor recargado')];

    await service.load();

    expect(getAllCalls).toBe(2);
    expect(service.loaded()).toBe(true);
    expect(service.findById(30)?.nombre).toBe('Proveedor recargado');
  });

  it('crea un borrador limpio mostrando únicamente Datos', (): void => {
    const workspace = service.crearBorrador();

    expect(workspace).toEqual({
      proveedorId: null,
      proveedorPublicId: null,
      draft: {
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        web: '',
        observaciones: '',
        foto: null,
        marcas: [],
      },
      baseSnapshot: {
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        web: '',
        observaciones: '',
        foto: null,
        marcas: [],
      },
      logoStagingId: null,
      activeSection: 'data',
      comercialWorkspace: null,
    });

    expect(service.hasWorkspace()).toBe(true);
    expect(service.dirty()).toBe(false);
    expect(service.comercialDirty()).toBe(false);
    expect(service.hasUnsavedChanges()).toBe(false);
  });

  it('abre un proveedor persistido con un draft independiente', (): void => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Distribuciones Norte', {
        foto: 'asset://files/providers/proveedor-12.webp',
        marcas: [3, 1],
      }),
    );

    const workspace = service.abrirFicha(proveedor);

    expect(workspace).toMatchObject({
      proveedorId: 12,
      proveedorPublicId: 'proveedor-12',
      activeSection: 'data',
      logoStagingId: null,
      comercialWorkspace: null,
      draft: {
        nombre: 'Distribuciones Norte',
        telefono: '944000000',
        email: 'proveedor@example.com',
        direccion: 'Dirección',
        web: 'https://proveedor.example.com',
        observaciones: 'Observaciones',
        foto: 'asset://files/providers/proveedor-12.webp',
        marcas: [3, 1],
      },
    });

    expect(workspace.draft).not.toBe(workspace.baseSnapshot);

    expect(workspace.draft.marcas).not.toBe(workspace.baseSnapshot.marcas);

    expect(service.dirty()).toBe(false);
  });

  it('deriva el dirty principal de Datos, Marcas y Logo', (): void => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        marcas: [3, 1],
      }),
    );

    service.abrirFicha(proveedor);

    const original = service.workspace();

    if (original === null) {
      throw new Error('Workspace de prueba inexistente.');
    }

    service.actualizarDraft({
      ...original.draft,
      telefono: '944111111',
    });

    expect(service.dirty()).toBe(true);

    service.actualizarDraft({
      ...original.baseSnapshot,
      marcas: [1, 3],
    });

    /*
     * El orden de las mismas Marcas
     * no altera el estado persistible.
     */
    expect(service.dirty()).toBe(false);

    service.actualizarDraft({
      ...original.baseSnapshot,
      marcas: [1, 2, 3],
    });

    expect(service.dirty()).toBe(true);
  });

  it('permite únicamente Datos mientras el proveedor no está persistido', (): void => {
    service.crearBorrador();

    expect(service.seleccionarSeccion('data').activeSection).toBe('data');

    expect((): void => {
      service.seleccionarSeccion('brands');
    }).toThrow('Las secciones Marcas y Comerciales requieren un proveedor persistido.');

    expect((): void => {
      service.seleccionarSeccion('commercials');
    }).toThrow('Las secciones Marcas y Comerciales requieren un proveedor persistido.');
  });

  it('permite Datos, Marcas y Comerciales para un proveedor persistido', (): void => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor'),
    );

    service.abrirFicha(proveedor);

    expect(service.seleccionarSeccion('brands').activeSection).toBe('brands');

    expect(service.seleccionarSeccion('commercials').activeSection).toBe('commercials');

    expect(service.seleccionarSeccion('data').activeSection).toBe('data');
  });

  it('mantiene separado el dirty de Comercial del dirty principal', (): void => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor'),
    );

    service.abrirFicha(proveedor);

    const comercialWorkspace = service.crearBorradorComercial();

    expect(comercialWorkspace.state).toBe('new');

    expect(service.dirty()).toBe(false);
    expect(service.comercialDirty()).toBe(false);

    service.actualizarComercialDraft({
      ...comercialWorkspace.draft,
      nombre: 'Nuevo comercial',
    });

    expect(service.dirty()).toBe(false);
    expect(service.comercialDirty()).toBe(true);
    expect(service.hasUnsavedChanges()).toBe(true);

    service.cancelarCambiosComercial();

    expect(service.dirty()).toBe(false);
    expect(service.comercialDirty()).toBe(false);
    expect(service.hasUnsavedChanges()).toBe(false);
  });

  it('abre un comercial existente únicamente dentro de su proveedor', (): void => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor'),
    );

    service.abrirFicha(proveedor);

    const comercial = proveedor.comerciales[0];

    if (comercial === undefined) {
      throw new Error('Comercial de prueba inexistente.');
    }

    const comercialWorkspace = service.abrirComercial(comercial);

    expect(comercialWorkspace).toMatchObject({
      comercialId: 120,
      comercialPublicId: 'comercial-12',
      state: 'existing',
      draft: {
        nombre: 'Comercial',
        telefono: '600000000',
        email: 'comercial@example.com',
        observaciones: 'Observaciones comercial',
      },
    });

    expect(service.comercialDirty()).toBe(false);
  });

  it('conserva el workspace hasta que se cierra explícitamente', async (): Promise<void> => {
    service.crearBorrador();

    const workspace = service.workspace();

    expect(workspace).not.toBeNull();

    /*
     * La navegación de Compras no llama a
     * cerrarFicha(), por lo que destruir/recrear
     * el componente visual no elimina este estado.
     */
    expect(service.workspace()).toBe(workspace);

    await service.cerrarFicha();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.dirty()).toBe(false);
    expect(service.comercialDirty()).toBe(false);
  });

  it('clear elimina también el workspace conservado', (): void => {
    service.crearBorrador();

    service.clear();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.dirty()).toBe(false);
    expect(service.proveedores()).toEqual([]);
    expect(service.loaded()).toBe(false);
  });

  it('crea un Proveedor desde el workspace normalizando los textos', async (): Promise<void> => {
    createResult = createProveedorInterface(20, 'proveedor-20', 'Proveedor nuevo', {
      telefono: null,
      email: 'info@example.com',
      direccion: 'Calle Nueva 1',
      web: null,
      observaciones: null,
      marcas: [],
    });

    service.crearBorrador();

    const workspace = requireWorkspace();

    service.actualizarDraft({
      ...workspace.draft,
      nombre: '  Proveedor nuevo  ',
      telefono: '   ',
      email: '  info@example.com  ',
      direccion: '  Calle Nueva 1  ',
      web: '',
      observaciones: '   ',
    });

    const proveedor = await service.saveWorkspace();

    expect(createCalls).toEqual([
      {
        nombre: 'Proveedor nuevo',
        telefono: null,
        email: 'info@example.com',
        direccion: 'Calle Nueva 1',
        web: null,
        observaciones: null,
        idsMarcas: [],
      },
    ]);

    expect(proveedor.id).toBe(20);
    expect(service.dirty()).toBe(false);
    expect(service.saving()).toBe(false);

    expect(requireWorkspace().proveedorId).toBe(20);
  });

  it('sustituye un staging anterior únicamente después de preparar el nuevo', async (): Promise<void> => {
    service.crearBorrador();

    await service.seleccionarLogo(new File(['logo-1'], 'logo-1.png'));

    expect(requireWorkspace().logoStagingId).toBe('staging-1');

    filesService.nextStagedImage = createStagedImage('staging-2', 'asset://staging/logo-2.webp');

    await service.seleccionarLogo(new File(['logo-2'], 'logo-2.png'));

    expect(filesService.discardCalls).toEqual(['staging-1']);

    expect(requireWorkspace().logoStagingId).toBe('staging-2');
  });

  it('descarta el logo temporal al cancelar y restaura el persistido', async (): Promise<void> => {
    const proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        foto: 'asset://files/providers/proveedor.webp',
      }),
    );

    service.abrirFicha(proveedor);

    await service.seleccionarLogo(new File(['nuevo'], 'nuevo.png'));

    await service.cancelarCambios();

    expect(filesService.discardCalls).toEqual(['staging-1']);

    expect(requireWorkspace().draft.foto).toBe('asset://files/providers/proveedor.webp');

    expect(service.dirty()).toBe(false);
  });

  it('envía el staging al crear un Proveedor con logo', async (): Promise<void> => {
    createResult = createProveedorInterface(20, 'proveedor-20', 'Proveedor', {
      foto: 'asset://files/providers/proveedor-20.webp',
      marcas: [],
    });

    service.crearBorrador();

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Proveedor',
    });

    await service.seleccionarLogo(new File(['logo'], 'logo.png'));

    await service.saveWorkspace();

    expect(createCalls).toEqual([
      {
        nombre: 'Proveedor',
        telefono: null,
        email: null,
        direccion: null,
        web: null,
        observaciones: null,
        idsMarcas: [],
        logoStagingId: 'staging-1',
      },
    ]);

    expect(requireWorkspace().logoStagingId).toBeNull();

    expect(service.dirty()).toBe(false);
  });

  it('envía remove al quitar un logo persistido', async (): Promise<void> => {
    const proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        foto: 'asset://files/providers/proveedor.webp',
      }),
    );

    updateResult = createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
      foto: null,
    });

    service.abrirFicha(proveedor);

    await service.quitarLogo();

    await service.saveWorkspace();

    expect(updateCalls[0]).toEqual({
      id: 12,
      command: expect.objectContaining({
        logo: {
          action: 'remove',
        },
      }),
    });

    expect(requireWorkspace().draft.foto).toBeNull();

    expect(service.dirty()).toBe(false);
  });

  it('envía replace al sustituir el logo persistido', async (): Promise<void> => {
    const proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        foto: 'asset://files/providers/proveedor.webp',
      }),
    );

    updateResult = createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
      foto: 'asset://files/providers/nuevo.webp',
    });

    service.abrirFicha(proveedor);

    await service.seleccionarLogo(new File(['nuevo'], 'nuevo.png'));

    await service.saveWorkspace();

    expect(updateCalls[0]).toEqual({
      id: 12,
      command: expect.objectContaining({
        logo: {
          action: 'replace',
          stagingId: 'staging-1',
        },
      }),
    });
  });

  it('conserva draft y staging si falla el guardado', async (): Promise<void> => {
    createError = new Error('No se pudo guardar.');

    service.crearBorrador();

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Proveedor pendiente',
    });

    await service.seleccionarLogo(new File(['logo'], 'logo.png'));

    await expect(service.saveWorkspace()).rejects.toThrow('No se pudo guardar.');

    expect(requireWorkspace().logoStagingId).toBe('staging-1');

    expect(service.dirty()).toBe(true);

    expect(service.saving()).toBe(false);
  });

  it('comparte el dirty entre Datos y Marcas y Cancelar restaura ambas partes', async (): Promise<void> => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        marcas: [1, 2],
      }),
    );

    service.abrirFicha(proveedor);

    service.actualizarDraft({
      ...requireWorkspace().draft,
      telefono: '944111111',
      marcas: [2, 3],
    });

    expect(service.dirty()).toBe(true);

    expect(requireWorkspace().draft.marcas).toEqual([2, 3]);

    await service.cancelarCambios();

    expect(requireWorkspace().draft.telefono).toBe('944000000');

    expect(requireWorkspace().draft.marcas).toEqual([1, 2]);

    expect(service.dirty()).toBe(false);
  });

  it('persiste la selección editable de Marcas mediante idsMarcas', async (): Promise<void> => {
    const proveedor: Proveedor = new Proveedor().fromInterface(
      createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
        marcas: [1],
      }),
    );

    updateResult = createProveedorInterface(12, 'proveedor-12', 'Proveedor', {
      marcas: [2, 3],
    });

    service.abrirFicha(proveedor);

    service.actualizarDraft({
      ...requireWorkspace().draft,
      marcas: [2, 3],
    });

    await service.saveWorkspace();

    expect(updateCalls).toHaveLength(1);

    expect(updateCalls[0]?.command.idsMarcas).toEqual([2, 3]);

    expect(requireWorkspace().draft.marcas).toEqual([2, 3]);

    expect(requireWorkspace().baseSnapshot.marcas).toEqual([2, 3]);

    expect(service.dirty()).toBe(false);
  });

  it('crea un Comercial desde su workspace y lo reconcilia sin recargar proveedores', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor')];

    await service.load();

    const proveedor: Proveedor | null = service.findById(12);

    if (proveedor === null) {
      throw new Error('Proveedor de prueba inexistente.');
    }

    service.abrirFicha(proveedor);

    const comercialWorkspace = service.crearBorradorComercial();

    service.actualizarComercialDraft({
      ...comercialWorkspace.draft,
      nombre: '  Comercial nuevo  ',
      telefono: '  600111222  ',
      email: '  nuevo@example.com  ',
      observaciones: '   ',
    });

    createComercialResult = createComercialInterface(121, 'comercial-121', 12, 'Comercial nuevo', {
      telefono: '600111222',
      email: 'nuevo@example.com',
      observaciones: null,
    });

    const comercial = await service.saveComercialWorkspace();

    expect(createComercialCalls).toEqual([
      {
        idProveedor: 12,
        command: {
          nombre: 'Comercial nuevo',
          telefono: '600111222',
          email: 'nuevo@example.com',
          observaciones: null,
        },
      },
    ]);

    expect(comercial.id).toBe(121);

    expect(service.findById(12)?.comerciales.map((item): string => item.nombre)).toEqual([
      'Comercial',
      'Comercial nuevo',
    ]);

    expect(requireWorkspace().comercialWorkspace).toMatchObject({
      comercialId: 121,
      comercialPublicId: 'comercial-121',
      state: 'existing',
      draft: {
        nombre: 'Comercial nuevo',
      },
      baseSnapshot: {
        nombre: 'Comercial nuevo',
      },
    });

    expect(service.comercialDirty()).toBe(false);

    /*
     * Solo existe la carga inicial.
     * El CREATE no hace reload.
     */
    expect(getAllCalls).toBe(1);
  });

  it('actualiza un Comercial y sustituye inmediatamente su versión canónica', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor')];

    await service.load();

    const proveedor: Proveedor | null = service.findById(12);

    const comercial = proveedor?.comerciales[0];

    if (proveedor === null || comercial === undefined) {
      throw new Error('Escenario de prueba incompleto.');
    }

    service.abrirFicha(proveedor);

    const workspace = service.abrirComercial(comercial);

    service.actualizarComercialDraft({
      ...workspace.draft,
      nombre: 'Comercial actualizado',
      telefono: '',
    });

    updateComercialResult = createComercialInterface(
      120,
      'comercial-12',
      12,
      'Comercial actualizado',
      {
        telefono: null,
      },
    );

    await service.saveComercialWorkspace();

    expect(updateComercialCalls).toEqual([
      {
        idProveedor: 12,
        idComercial: 120,
        command: {
          nombre: 'Comercial actualizado',
          telefono: null,
          email: 'comercial@example.com',
          observaciones: 'Observaciones comercial',
        },
      },
    ]);

    expect(service.findById(12)?.comerciales).toHaveLength(1);

    expect(service.findById(12)?.comerciales[0]?.nombre).toBe('Comercial actualizado');

    expect(service.comercialDirty()).toBe(false);

    expect(getAllCalls).toBe(1);
  });

  it('elimina un Comercial del maestro canónico sin recargar proveedores', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor')];

    await service.load();

    const proveedor: Proveedor | null = service.findById(12);

    const comercial = proveedor?.comerciales[0];

    if (proveedor === null || comercial === undefined) {
      throw new Error('Escenario de prueba incompleto.');
    }

    service.abrirFicha(proveedor);

    service.abrirComercial(comercial);

    await service.deactivateComercialWorkspace();

    expect(deactivateComercialCalls).toEqual([
      {
        idProveedor: 12,
        idComercial: 120,
      },
    ]);

    expect(service.findById(12)?.comerciales).toEqual([]);

    expect(requireWorkspace().comercialWorkspace).toBeNull();

    expect(service.comercialDirty()).toBe(false);

    expect(getAllCalls).toBe(1);
  });

  it('conserva el draft dirty si falla el guardado del Comercial', async (): Promise<void> => {
    getAllResult = [createProveedorInterface(12, 'proveedor-12', 'Proveedor')];

    await service.load();

    const proveedor: Proveedor | null = service.findById(12);

    if (proveedor === null) {
      throw new Error('Proveedor de prueba inexistente.');
    }

    service.abrirFicha(proveedor);

    const comercialWorkspace = service.crearBorradorComercial();

    service.actualizarComercialDraft({
      ...comercialWorkspace.draft,
      nombre: 'Pendiente',
    });

    createComercialError = new Error('No se pudo guardar.');

    await expect(service.saveComercialWorkspace()).rejects.toThrow('No se pudo guardar.');

    expect(service.comercialDirty()).toBe(true);

    expect(requireWorkspace().comercialWorkspace?.draft.nombre).toBe('Pendiente');

    expect(service.comercialSaving()).toBe(false);

    expect(service.findById(12)?.comerciales).toHaveLength(1);
  });
});

function createProveedorInterface(
  id: number,
  publicId: string,
  nombre: string,
  overrides: Partial<ProveedorInterface> = {},
): ProveedorInterface {
  return {
    id,
    publicId,
    nombre,
    foto: null,
    direccion: 'Dirección',
    telefono: '944000000',
    email: 'proveedor@example.com',
    web: 'https://proveedor.example.com',
    observaciones: 'Observaciones',
    marcas: [1],
    comerciales: [
      {
        id: id * 10,
        publicId: `comercial-${id}`,
        idProveedor: id,
        nombre: 'Comercial',
        telefono: '600000000',
        email: 'comercial@example.com',
        observaciones: 'Observaciones comercial',
      },
    ],
    ...overrides,
  };
}

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

function createUpdateCommand(
  overrides: Partial<ActualizarProveedorCommand> = {},
): ActualizarProveedorCommand {
  return {
    nombre: 'Proveedor actualizado',
    direccion: null,
    email: null,
    web: null,
    telefono: null,
    observaciones: null,
    idsMarcas: [],
    ...overrides,
  };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolvePromise: ((value: T) => void) | null = null;

  const promise: Promise<T> = new Promise<T>((resolve: (value: T) => void): void => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value: T): void => {
      if (resolvePromise === null) {
        throw new Error('La promesa diferida todavía no está inicializada.');
      }

      resolvePromise(value);
    },
  };
}

function requireWorkspace(): ProveedorWorkspace {
  const workspace: ProveedorWorkspace | null = service.workspace();

  if (workspace === null) {
    throw new Error('Workspace de prueba inexistente.');
  }

  return workspace;
}

class FakeFilesService extends FilesService {
  readonly stageProviderCalls: File[] = [];

  readonly discardCalls: string[] = [];

  nextStagedImage: StagedImageInterface = createStagedImage(
    'staging-1',
    'asset://staging/logo-1.webp',
  );

  stageError: Error | null = null;

  discardError: Error | null = null;

  override stageProviderImage(file: File): Promise<StagedImageInterface> {
    this.stageProviderCalls.push(file);

    return this.stageError === null
      ? Promise.resolve(this.nextStagedImage)
      : Promise.reject(this.stageError);
  }

  override discardStagedImage(stagingId: string): Promise<void> {
    this.discardCalls.push(stagingId);

    return this.discardError === null ? Promise.resolve() : Promise.reject(this.discardError);
  }
}

function createStagedImage(stagingId: string, url: string): StagedImageInterface {
  return {
    stagingId,
    purpose: 'provider_image',
    originalName: 'logo.png',
    url,
    mimeType: 'image/webp',
    sizeBytes: 1024,
    width: 640,
    height: 480,
  };
}

function createComercialInterface(
  id: number,
  publicId: string,
  idProveedor: number,
  nombre: string,
  overrides: Partial<ComercialInterface> = {},
): ComercialInterface {
  return {
    id,
    publicId,
    idProveedor,
    nombre,
    telefono: '600000000',
    email: 'comercial@example.com',
    observaciones: 'Observaciones comercial',
    ...overrides,
  };
}
