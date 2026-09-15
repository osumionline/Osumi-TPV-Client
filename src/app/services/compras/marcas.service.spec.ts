import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import Marca from '@model/marcas/marca.model';
import MarcasService from '@services/compras/marcas.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: MarcasService;
let originalDesktopDescriptor: PropertyDescriptor | undefined;
let createCalls: CrearMarcaCommand[];
let updateCalls: {
  readonly id: number;
  readonly command: ActualizarMarcaCommand;
}[];
let createResult: MarcaInterface;
let updateResult: MarcaInterface;
let createError: Error | null;
let updateError: Error | null;

describe('MarcasService workspace', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    createCalls = [];
    updateCalls = [];

    createResult = createMarcaInterface(20, 'marca-20', 'Nueva marca');

    updateResult = createMarcaInterface(12, 'marca-12', 'Bosquimia');

    createError = null;
    updateError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        marcas: {
          getAll: (): Promise<readonly MarcaInterface[]> => Promise.resolve([]),

          getById: (): Promise<MarcaInterface | null> => Promise.resolve(null),

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

          deactivate: (): Promise<void> => Promise.resolve(),
        },
      },
    });

    service = new MarcasService();
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

  it('cancela las modificaciones restaurando la instantánea base', (): void => {
    service.abrirFicha(createMarca());

    const original: MarcaFormModel = requireWorkspace().baseSnapshot;

    service.actualizarDraft({
      ...requireWorkspace().draft,
      nombre: 'Nombre modificado',
      observaciones: 'Cambio pendiente',
    });

    expect(service.dirty()).toBe(true);

    const cancelled = service.cancelarCambios();

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

  it('cierra únicamente la ficha conservando el maestro', (): void => {
    service.abrirFicha(createMarca());

    service.cerrarFicha();

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

  it('impide operar sobre una ficha inexistente', (): void => {
    expect((): void => {
      service.cancelarCambios();
    }).toThrow('No hay ninguna ficha de marca abierta.');

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
