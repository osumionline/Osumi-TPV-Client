import { TestBed } from '@angular/core/testing';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: TiposPagoService;

let originalDesktopDescriptor: PropertyDescriptor | undefined;

let getAllCalls: number;

let getAllResult: readonly TipoPagoInterface[];

describe('TiposPagoService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    getAllCalls = 0;

    /*
     * Llegan deliberadamente
     * desordenados para comprobar
     * el orden mantenido en memoria.
     */
    getAllResult = [
      createTipoPagoInterface({
        id: 3,
        publicId: 'tipo-pago-bizum',
        nombre: 'Bizum',
        slug: 'bizum',
        foto: 'osumi://assets/files/payment-types/bizum.webp',
        afectaCaja: false,
        orden: 2,
      }),

      createTipoPagoInterface({
        id: 1,
        publicId: 'tipo-pago-efectivo',
        nombre: 'Efectivo',
        slug: 'efectivo',
        foto: null,
        afectaCaja: true,
        orden: 0,
      }),

      createTipoPagoInterface({
        id: 2,
        publicId: 'tipo-pago-visa',
        nombre: 'VISA',
        slug: 'visa',
        foto: 'osumi://assets/files/payment-types/visa.webp',
        afectaCaja: false,
        orden: 1,
      }),
    ];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        tiposPago: {
          getAll: (): Promise<readonly TipoPagoInterface[]> => {
            getAllCalls++;

            return Promise.resolve(getAllResult);
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [TiposPagoService],
    });

    service = TestBed.inject(TiposPagoService);
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('carga el maestro una sola vez y lo mantiene ordenado en memoria', async (): Promise<void> => {
    await service.load();
    await service.load();

    expect(getAllCalls).toBe(1);

    expect(service.tiposPago().map((tipoPago: TipoPago): string => tipoPago.slug)).toEqual([
      'efectivo',
      'visa',
      'bizum',
    ]);

    expect(service.loaded()).toBe(true);
  });

  it('fuerza una nueva carga al ejecutar reload', async (): Promise<void> => {
    await service.load();
    await service.reload();

    expect(getAllCalls).toBe(2);
  });

  it('mantiene Efectivo dentro del maestro global', async (): Promise<void> => {
    await service.load();

    const efectivo: TipoPago | null = service.findBySlug('efectivo');

    expect(efectivo).not.toBeNull();

    expect(efectivo?.nombre).toBe('Efectivo');

    expect(efectivo?.foto).toBeNull();

    expect(efectivo?.afectaCaja).toBe(true);
  });

  it('busca tipos de pago por id, publicId y slug', async (): Promise<void> => {
    await service.load();

    expect(service.findById(2)?.nombre).toBe('VISA');

    expect(service.findByPublicId('tipo-pago-bizum')?.nombre).toBe('Bizum');

    expect(service.findBySlug(' VISA ')?.nombre).toBe('VISA');

    expect(service.findById(999)).toBeNull();

    expect(service.findByPublicId('no-existe')).toBeNull();

    expect(service.findBySlug('no-existe')).toBeNull();
  });

  it('limpia completamente el estado en memoria', async (): Promise<void> => {
    await service.load();

    expect(service.loaded()).toBe(true);

    expect(service.tiposPago()).toHaveLength(3);

    service.clear();

    expect(service.loaded()).toBe(false);

    expect(service.tiposPago()).toEqual([]);
  });
});

/**
 * Crea un contrato público de tipo de pago
 * para los tests del servicio.
 */
function createTipoPagoInterface(overrides: Partial<TipoPagoInterface> = {}): TipoPagoInterface {
  return {
    id: 1,
    publicId: 'tipo-pago-1',
    nombre: 'Efectivo',
    slug: 'efectivo',
    foto: null,
    afectaCaja: true,
    orden: 0,
    fisico: true,
    ...overrides,
  };
}
