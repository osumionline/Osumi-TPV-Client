import { TestBed } from '@angular/core/testing';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/marcas/marca-estadisticas.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import Marca from '@model/marcas/marca.model';
import FilesService from '@services/application/files.service';
import MarcasService from '@services/compras/marcas.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: MarcasService;
let filesService: FakeFilesService;
let originalDesktopDescriptor: PropertyDescriptor | undefined;
let getAllCalls: number;
let createCalls: CrearMarcaCommand[];
let updateCalls: {
  readonly id: number;
  readonly command: ActualizarMarcaCommand;
}[];
let deactivateCalls: number[];
let deactivateError: Error | null;
let createResult: MarcaInterface;
let updateResult: MarcaInterface;
let createError: Error | null;
let updateError: Error | null;
let estadisticasCalls: MarcaEstadisticasConsulta[];
let estadisticasResult: MarcaEstadisticasResultado;

describe('MarcasService workspace', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');
    getAllCalls = 0;
    createCalls = [];
    updateCalls = [];
    deactivateCalls = [];
    deactivateError = null;

    createResult = createMarcaInterface(20, 'marca-20', 'Nueva marca');

    updateResult = createMarcaInterface(12, 'marca-12', 'Bosquimia');

    createError = null;
    updateError = null;
    estadisticasCalls = [];

    estadisticasResult = {
      tipo: 'amount',
      availableYears: [2026],
      points: [],
      total: 0,
    };

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        marcas: {
          getAll: (): Promise<readonly MarcaInterface[]> => {
            getAllCalls++;

            return Promise.resolve([]);
          },

          getById: (): Promise<MarcaInterface | null> => Promise.resolve(null),

          getEstadisticas: (
            consulta: MarcaEstadisticasConsulta,
          ): Promise<MarcaEstadisticasResultado> => {
            estadisticasCalls.push(consulta);

            return Promise.resolve(estadisticasResult);
          },

          create: (command: CrearMarcaCommand): Promise<MarcaInterface> => {
            createCalls.push(command);

            return createError === null
              ? Promise.resolve(createResult)
              : Promise.reject(createError);
          },

          update: (id: number, command: ActualizarMarcaCommand): Promise<MarcaInterface> => {
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
        },
      },
    });

    filesService = new FakeFilesService();

    TestBed.configureTestingModule({
      providers: [
        MarcasService,
        {
          provide: FilesService,
          useValue: filesService,
        },
      ],
    });

    service = TestBed.inject(MarcasService);
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('crea un borrador limpio mostrando únicamente Datos', (): void => {
    const workspace = service.crearBorrador();

    expect(workspace).toMatchObject({
      marcaId: null,
      marcaPublicId: null,
      activeSection: 'data',
      draft: {
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        web: '',
        observaciones: '',
        foto: null,
      },
    });

    expect(service.hasWorkspace()).toBe(true);
    expect(service.dirty()).toBe(false);
  });

  it('abre una marca persistida con una copia editable independiente', (): void => {
    const marca: Marca = createMarca();

    const workspace = service.abrirFicha(marca);

    expect(workspace).toMatchObject({
      marcaId: 12,
      marcaPublicId: 'marca-12',
      activeSection: 'data',
      draft: {
        nombre: 'Bosquimia',
        telefono: '944000000',
        email: 'info@bosquimia.example.com',
        direccion: 'Calle Mayor 1',
        web: 'https://bosquimia.example.com',
        observaciones: 'Observaciones originales',
        foto: 'asset://files/brands/bosquimia.webp',
      },
    });

    expect(workspace.draft).not.toBe(workspace.baseSnapshot);
    expect(service.dirty()).toBe(false);
  });

  it('deriva dirty comparando el draft contra la instantánea base', (): void => {
    service.abrirFicha(createMarca());

    const current = requireWorkspace();

    service.actualizarDraft({
      ...current.draft,
      telefono: '944111111',
    });

    expect(service.dirty()).toBe(true);

    service.actualizarDraft({
      ...requireWorkspace().draft,
      telefono: current.baseSnapshot.telefono,
    });

    expect(service.dirty()).toBe(false);
  });

  it('cancela las modificaciones restaurando la instantánea base', async (): Promise<void> => {
    service.abrirFicha(createMarca());

    const original: MarcaFormModel = requireWorkspace().baseSnapshot;

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Nombre modificado',
      observaciones: 'Cambio pendiente',
    });

    expect(service.dirty()).toBe(true);

    const cancelled = await service.cancelarCambios();

    expect(cancelled.draft).toEqual(original);
    expect(cancelled.draft).not.toBe(cancelled.baseSnapshot);
    expect(service.dirty()).toBe(false);
  });

  it('permite Estadísticas únicamente para una marca persistida', (): void => {
    service.crearBorrador();

    expect((): void => {
      service.seleccionarSeccion('statistics');
    }).toThrow('Las estadísticas requieren una marca persistida.');

    service.abrirFicha(createMarca());

    expect(service.seleccionarSeccion('statistics').activeSection).toBe('statistics');
  });

  it('inicializa los filtros con el mes y año actuales', (): void => {
    const now: Date = new Date();

    service.abrirFicha(createMarca());

    expect(requireWorkspace().estadisticasFiltros).toEqual({
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
      tipo: 'amount',
    });
  });

  it('conserva y normaliza los filtros estadísticos', (): void => {
    service.abrirFicha(createMarca());

    const filters: MarcaEstadisticasFiltros = {
      mes: 4,
      anio: 'all',
      tipo: 'units',
    };

    const workspace = service.actualizarFiltrosEstadisticas(filters);

    expect(workspace.estadisticasFiltros).toEqual({
      mes: 'all',
      anio: 'all',
      tipo: 'units',
    });
  });

  it('no permite modificar filtros estadísticos en una marca nueva', (): void => {
    service.crearBorrador();

    expect((): void => {
      service.actualizarFiltrosEstadisticas({
        mes: 'all',
        anio: 2026,
        tipo: 'amount',
      });
    }).toThrow('Las estadísticas requieren una marca persistida.');
  });

  it('mantiene el workspace aunque no se vuelva a abrir la ficha', (): void => {
    service.abrirFicha(createMarca());
    service.seleccionarSeccion('statistics');

    service.actualizarFiltrosEstadisticas({
      mes: 'all',
      anio: 2025,
      tipo: 'units',
    });

    const before = service.workspace();
    const after = service.workspace();

    expect(after).toBe(before);
    expect(after?.activeSection).toBe('statistics');
    expect(after?.estadisticasFiltros).toEqual({
      mes: 'all',
      anio: 2025,
      tipo: 'units',
    });
  });

  it('cierra únicamente la ficha conservando el maestro', async (): Promise<void> => {
    service.abrirFicha(createMarca());

    await service.cerrarFicha();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.dirty()).toBe(false);
  });

  it('clear elimina también el workspace conservado', (): void => {
    service.abrirFicha(createMarca());

    service.clear();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.dirty()).toBe(false);
    expect(service.marcas()).toEqual([]);
    expect(service.loaded()).toBe(false);
  });

  it('impide operar sobre una ficha inexistente', async (): Promise<void> => {
    await expect(service.cancelarCambios()).rejects.toThrow(
      'No hay ninguna ficha de marca abierta.',
    );

    expect((): void => {
      service.actualizarDraft(createDraft());
    }).toThrow('No hay ninguna ficha de marca abierta.');

    expect((): void => {
      service.seleccionarSeccion('data');
    }).toThrow('No hay ninguna ficha de marca abierta.');
  });

  it('solicita foco en Nombre al crear o abrir una ficha', (): void => {
    expect(service.focusNameRequest()).toBe(0);

    service.crearBorrador();

    expect(service.focusNameRequest()).toBe(1);

    service.abrirFicha(createMarca());

    expect(service.focusNameRequest()).toBe(2);
  });

  it('crea una Marca desde el workspace y lo convierte en persistido', async (): Promise<void> => {
    createResult = {
      ...createMarcaInterface(20, 'marca-20', 'Nueva marca'),
      email: 'info@marca.test',
      direccion: 'Calle Nueva 1',
    };

    service.crearBorrador();

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: '  Nueva marca  ',
      telefono: '   ',
      email: '  info@marca.test  ',
      direccion: '  Calle Nueva 1  ',
      web: '',
      observaciones: '   ',
    });

    const marca: Marca = await service.saveWorkspace();

    expect(createCalls).toEqual([
      {
        nombre: 'Nueva marca',
        telefono: null,
        email: 'info@marca.test',
        direccion: 'Calle Nueva 1',
        web: null,
        observaciones: null,
        crearProveedor: false,
      },
    ]);

    expect(marca.id).toBe(20);

    expect(service.marcas()).toEqual([marca]);

    expect(requireWorkspace()).toMatchObject({
      marcaId: 20,
      marcaPublicId: 'marca-20',
      draft: {
        nombre: 'Nueva marca',
        email: 'info@marca.test',
        direccion: 'Calle Nueva 1',
      },
    });

    expect(service.dirty()).toBe(false);
    expect(service.saving()).toBe(false);
  });
  it('actualiza una Marca y sustituye su versión canónica en memoria', async (): Promise<void> => {
    updateResult = {
      ...createMarcaInterface(12, 'marca-12', 'Bosquimia renovada'),
      foto: 'asset://files/brands/bosquimia.webp',
      email: 'nuevo@bosquimia.test',
    };

    service.abrirFicha(createMarca());

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: ' Bosquimia renovada ',
      telefono: '',
      email: ' nuevo@bosquimia.test ',
      direccion: '',
      web: '',
      observaciones: '',
    });

    const marca: Marca = await service.saveWorkspace();

    expect(updateCalls).toEqual([
      {
        id: 12,
        command: {
          nombre: 'Bosquimia renovada',
          telefono: null,
          email: 'nuevo@bosquimia.test',
          direccion: null,
          web: null,
          observaciones: null,
        },
      },
    ]);

    expect(marca.foto).toBe('asset://files/brands/bosquimia.webp');

    expect(service.findByPublicId('marca-12')).toBe(marca);

    expect(requireWorkspace().baseSnapshot).toEqual(requireWorkspace().draft);

    expect(service.dirty()).toBe(false);
    expect(service.saving()).toBe(false);
  });

  it('sincroniza altas, cambios y bajas del maestro sin recargarlo', async (): Promise<void> => {
    createResult = createMarcaInterface(20, 'marca-20', 'Zeta');

    await service.create({
      nombre: 'Zeta',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
      crearProveedor: false,
    });

    createResult = createMarcaInterface(21, 'marca-21', 'Alfa');

    await service.create({
      nombre: 'Alfa',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
      crearProveedor: false,
    });

    expect(service.marcas().map((marca: Marca): string => marca.nombre)).toEqual(['Alfa', 'Zeta']);

    updateResult = createMarcaInterface(20, 'marca-20', 'Aardvark');

    await service.update(20, {
      nombre: 'Aardvark',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
    });

    expect(service.marcas().map((marca: Marca): string => marca.nombre)).toEqual([
      'Aardvark',
      'Alfa',
    ]);

    await service.deactivate(21);

    expect(service.marcas().map((marca: Marca): string => marca.nombre)).toEqual(['Aardvark']);

    expect(getAllCalls).toBe(0);
  });

  it('conserva el draft dirty y el maestro si falla el guardado', async (): Promise<void> => {
    createError = new Error('No se pudo guardar.');

    service.crearBorrador();

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Marca pendiente',
    });

    await expect(service.saveWorkspace()).rejects.toThrow('No se pudo guardar.');

    expect(service.marcas()).toEqual([]);
    expect(service.dirty()).toBe(true);
    expect(service.saving()).toBe(false);

    expect(requireWorkspace().draft.nombre).toBe('Marca pendiente');
  });

  it('sustituye un staging anterior solo después de preparar el nuevo', async (): Promise<void> => {
    service.crearBorrador();

    await service.seleccionarLogo(new File(['logo-1'], 'logo-1.png'));

    expect(requireWorkspace().logoStagingId).toBe('staging-1');
    expect(requireWorkspace().draft.foto).toBe('asset://staging/logo-1.webp');

    filesService.nextStagedImage = createStagedImage('staging-2', 'asset://staging/logo-2.webp');

    await service.seleccionarLogo(new File(['logo-2'], 'logo-2.png'));

    expect(filesService.discardCalls).toEqual(['staging-1']);
    expect(requireWorkspace().logoStagingId).toBe('staging-2');
    expect(requireWorkspace().draft.foto).toBe('asset://staging/logo-2.webp');
  });

  it('descarta el logo temporal al cancelar y restaura el logo persistido', async (): Promise<void> => {
    service.abrirFicha(createMarca());

    await service.seleccionarLogo(new File(['nuevo'], 'nuevo.png'));

    expect(service.dirty()).toBe(true);

    await service.cancelarCambios();

    expect(filesService.discardCalls).toEqual(['staging-1']);
    expect(requireWorkspace().logoStagingId).toBeNull();
    expect(requireWorkspace().draft.foto).toBe('asset://files/brands/bosquimia.webp');
    expect(service.dirty()).toBe(false);
  });

  it('envía el staging al crear una Marca con logo', async (): Promise<void> => {
    createResult = {
      ...createMarcaInterface(20, 'marca-20', 'Nueva marca'),
      foto: 'asset://files/brands/marca-20.webp',
    };

    service.crearBorrador();
    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Nueva marca',
    });

    await service.seleccionarLogo(new File(['logo'], 'logo.png'));
    await service.saveWorkspace();

    expect(createCalls).toEqual([
      {
        nombre: 'Nueva marca',
        telefono: null,
        email: null,
        direccion: null,
        web: null,
        observaciones: null,
        crearProveedor: false,
        logoStagingId: 'staging-1',
      },
    ]);

    expect(requireWorkspace().logoStagingId).toBeNull();
    expect(requireWorkspace().draft.foto).toBe('asset://files/brands/marca-20.webp');
    expect(service.dirty()).toBe(false);
  });

  it('envía remove al guardar una Marca cuyo logo se ha quitado', async (): Promise<void> => {
    updateResult = {
      ...createMarcaInterface(12, 'marca-12', 'Bosquimia'),
      foto: null,
    };

    service.abrirFicha(createMarca());

    await service.quitarLogo();

    expect(service.dirty()).toBe(true);

    await service.saveWorkspace();

    expect(updateCalls).toEqual([
      {
        id: 12,
        command: {
          nombre: 'Bosquimia',
          telefono: '944000000',
          email: 'info@bosquimia.example.com',
          direccion: 'Calle Mayor 1',
          web: 'https://bosquimia.example.com',
          observaciones: 'Observaciones originales',
          logo: {
            action: 'remove',
          },
        },
      },
    ]);

    expect(requireWorkspace().draft.foto).toBeNull();
    expect(service.dirty()).toBe(false);
  });

  it('da de baja la Marca activa, la elimina del maestro y cierra el workspace', async (): Promise<void> => {
    createResult = createMarcaInterface(12, 'marca-12', 'Bosquimia');

    const marca: Marca = await service.create({
      nombre: 'Bosquimia',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
      crearProveedor: false,
    });

    service.abrirFicha(marca);

    await service.deactivateWorkspace();

    expect(deactivateCalls).toEqual([12]);

    expect(service.marcas()).toEqual([]);
    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.deactivating()).toBe(false);
  });

  it('no permite dar de baja una Marca todavía no persistida', async (): Promise<void> => {
    service.crearBorrador();

    await expect(service.deactivateWorkspace()).rejects.toThrow(
      'No se puede eliminar una marca que todavía no se ha guardado.',
    );

    expect(deactivateCalls).toEqual([]);
    expect(service.workspace()).not.toBeNull();
  });

  it('conserva maestro, workspace y staging si falla la baja', async (): Promise<void> => {
    createResult = {
      ...createMarcaInterface(12, 'marca-12', 'Bosquimia'),
      foto: 'asset://files/brands/bosquimia.webp',
    };

    const marca: Marca = await service.create({
      nombre: 'Bosquimia',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
      crearProveedor: false,
    });

    service.abrirFicha(marca);

    await service.seleccionarLogo(new File(['nuevo-logo'], 'nuevo-logo.png'));

    deactivateError = new Error('No se pudo eliminar.');

    await expect(service.deactivateWorkspace()).rejects.toThrow('No se pudo eliminar.');

    expect(service.marcas()).toEqual([marca]);

    expect(requireWorkspace().logoStagingId).toBe('staging-1');

    expect(filesService.discardCalls).toEqual([]);
    expect(service.deactivating()).toBe(false);
  });

  it('limpia el staging pendiente después de una baja confirmada', async (): Promise<void> => {
    createResult = createMarcaInterface(12, 'marca-12', 'Bosquimia');

    const marca: Marca = await service.create({
      nombre: 'Bosquimia',
      telefono: null,
      email: null,
      direccion: null,
      web: null,
      observaciones: null,
      crearProveedor: false,
    });

    service.abrirFicha(marca);

    await service.seleccionarLogo(new File(['nuevo-logo'], 'nuevo-logo.png'));

    await service.deactivateWorkspace();

    expect(filesService.discardCalls).toEqual(['staging-1']);

    expect(service.workspace()).toBeNull();
    expect(service.marcas()).toEqual([]);
  });

  it('traduce los filtros del workspace al contrato público de estadísticas', async (): Promise<void> => {
    estadisticasResult = {
      tipo: 'units',
      availableYears: [2024, 2026],
      points: [
        {
          year: 2024,
          month: null,
          day: null,
          value: 8,
        },
        {
          year: 2025,
          month: null,
          day: null,
          value: 0,
        },
        {
          year: 2026,
          month: null,
          day: null,
          value: 12,
        },
      ],
      total: 20,
    };

    const result: MarcaEstadisticasResultado = await service.getEstadisticas(12, {
      mes: 4,
      anio: 'all',
      tipo: 'units',
    });

    expect(estadisticasCalls).toEqual([
      {
        idMarca: 12,
        tipo: 'units',
        year: null,
        month: null,
      },
    ]);

    expect(result).toBe(estadisticasResult);
  });
});

/**
 * Construye una Marca persistida representativa.
 */
function createMarca(): Marca {
  const marca: Marca = new Marca();

  marca.id = 12;
  marca.publicId = 'marca-12';
  marca.nombre = 'Bosquimia';
  marca.telefono = '944000000';
  marca.email = 'info@bosquimia.example.com';
  marca.direccion = 'Calle Mayor 1';
  marca.web = 'https://bosquimia.example.com';
  marca.observaciones = 'Observaciones originales';
  marca.foto = 'asset://files/brands/bosquimia.webp';

  return marca;
}

/**
 * Construye un draft mínimo para pruebas sin workspace.
 */
function createDraft(): MarcaFormModel {
  return {
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    web: '',
    observaciones: '',
    foto: null,
  };
}

/**
 * Devuelve el workspace actual o falla explícitamente.
 */
function requireWorkspace(): MarcaWorkspace {
  const workspace: MarcaWorkspace | null = service.workspace();

  if (workspace === null) {
    throw new Error('Workspace de prueba inexistente.');
  }

  return workspace;
}

/**
 * Construye el contrato público de una Marca
 * persistida para las pruebas del servicio.
 */
function createMarcaInterface(id: number, publicId: string, nombre: string): MarcaInterface {
  return {
    id,
    publicId,
    nombre,
    direccion: null,
    foto: null,
    telefono: null,
    email: null,
    web: null,
    observaciones: null,
  };
}

/**
 * Simula las operaciones renderer de staging
 * necesarias para las pruebas de Marcas.
 */
class FakeFilesService extends FilesService {
  readonly stageBrandCalls: File[] = [];
  readonly discardCalls: string[] = [];

  nextStagedImage: StagedImageInterface = createStagedImage(
    'staging-1',
    'asset://staging/logo-1.webp',
  );

  stageError: Error | null = null;
  discardError: Error | null = null;

  /**
   * Simula la preparación temporal de un logo.
   */
  override stageBrandImage(file: File): Promise<StagedImageInterface> {
    this.stageBrandCalls.push(file);

    return this.stageError === null
      ? Promise.resolve(this.nextStagedImage)
      : Promise.reject(this.stageError);
  }

  /**
   * Simula la eliminación de un staging temporal.
   */
  override discardStagedImage(stagingId: string): Promise<void> {
    this.discardCalls.push(stagingId);

    return this.discardError === null ? Promise.resolve() : Promise.reject(this.discardError);
  }
}

/**
 * Construye un logo temporal representativo.
 */
function createStagedImage(stagingId: string, url: string): StagedImageInterface {
  return {
    stagingId,
    purpose: 'brand_image',
    originalName: 'logo.png',
    url,
    mimeType: 'image/webp',
    sizeBytes: 1024,
    width: 640,
    height: 480,
  };
}
