import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import Marca from '@model/marcas/marca.model';
import MarcasService from '@services/compras/marcas.service';
import { beforeEach, describe, expect, it } from 'vitest';

let service: MarcasService;

describe('MarcasService workspace', (): void => {
  beforeEach((): void => {
    service = new MarcasService();
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
