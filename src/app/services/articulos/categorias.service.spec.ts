import { TestBed } from '@angular/core/testing';
import type CategoriaInterface from '@desktop-contracts/articulos/categorias/categoria.interface';
import ApplicationLoggingService from '@services/application/application-logging.service';
import CategoriasService from '@services/articulos/categorias.service';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('CategoriasService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let result: readonly CategoriaInterface[];
  let requestError: Error | null;
  let warnMock: Mock;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    result = [
      {
        id: 1,
        publicId: 'categoria-1',
        idPadre: null,
        nombre: 'Categoría raíz',
        orden: 1,
      },
      {
        id: 2,
        publicId: 'categoria-2',
        idPadre: 1,
        nombre: 'Subcategoría',
        orden: 1,
      },
    ];

    requestError = null;
    warnMock = vi.fn();

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        categorias: {
          getAll: (): Promise<readonly CategoriaInterface[]> => {
            if (requestError !== null) {
              return Promise.reject(requestError);
            }

            return Promise.resolve(result);
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [
        CategoriasService,
        {
          provide: ApplicationLoggingService,
          useValue: {
            warn: warnMock,
          },
        },
      ],
    });
  });

  afterEach((): void => {
    TestBed.resetTestingModule();

    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('carga y construye el árbol sin generar avisos', async (): Promise<void> => {
    const service: CategoriasService = TestBed.inject(CategoriasService);

    await service.load();

    expect(service.loaded()).toBe(true);
    expect(service.categorias()).toHaveLength(1);
    expect(service.categoriasPlain()).toHaveLength(2);
    expect(service.categoriasPlain()[0]?.publicId).toBe('categoria-1');
    expect(service.categoriasPlain()[1]?.publicId).toBe('categoria-2');
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('registra y propaga un fallo al recuperar las categorías', async (): Promise<void> => {
    const error: Error = new Error('No se ha podido consultar SQLite.');

    requestError = error;

    const service: CategoriasService = TestBed.inject(CategoriasService);

    await expect(service.load()).rejects.toBe(error);

    expect(service.loaded()).toBe(false);

    expect(warnMock).toHaveBeenCalledOnce();

    expect(warnMock).toHaveBeenCalledWith({
      area: 'articulos',
      operation: 'load-categories',
      message: 'No se han podido cargar las categorías.',
      error,
    });
  });

  it('registra y propaga una incoherencia en la jerarquía recibida', async (): Promise<void> => {
    result = [
      {
        id: 2,
        publicId: 'categoria-2',
        idPadre: 999,
        nombre: 'Categoría huérfana',
        orden: 1,
      },
    ];

    const service: CategoriasService = TestBed.inject(CategoriasService);

    await expect(service.load()).rejects.toThrow('referencia una categoría padre no disponible.');

    expect(service.loaded()).toBe(false);

    expect(warnMock).toHaveBeenCalledOnce();

    expect(warnMock).toHaveBeenCalledWith({
      area: 'articulos',
      operation: 'load-categories',
      message: 'No se han podido cargar las categorías.',
      error: expect.objectContaining({
        message: expect.stringContaining('referencia una categoría padre no disponible.'),
      }),
    });
  });
});
