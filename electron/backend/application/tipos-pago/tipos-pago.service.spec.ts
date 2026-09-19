import TiposPagoService from '@backend/application/tipos-pago/tipos-pago.service';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import { describe, expect, it } from 'vitest';

class FakeTipoPagoRepository implements TipoPagoRepository {
  constructor(private readonly tiposPago: readonly TipoPagoRecord[]) {}

  /**
   * Devuelve el maestro configurado
   * para cada prueba.
   */
  findAll(): Promise<readonly TipoPagoRecord[]> {
    return Promise.resolve(this.tiposPago);
  }

  /**
   * Busca un tipo de pago activo
   * dentro del maestro simulado.
   */
  findById(id: number): Promise<TipoPagoRecord | null> {
    return Promise.resolve(
      this.tiposPago.find((tipoPago: TipoPagoRecord): boolean => tipoPago.id === id) ?? null,
    );
  }

  /**
   * Comprueba si existe un slug
   * dentro del maestro simulado.
   */
  existsActiveBySlug(slug: string, excludeId: number | null): Promise<boolean> {
    const normalizedSlug: string = slug.toLocaleLowerCase('es-ES');

    return Promise.resolve(
      this.tiposPago.some(
        (tipoPago: TipoPagoRecord): boolean =>
          tipoPago.id !== excludeId && tipoPago.slug.toLocaleLowerCase('es-ES') === normalizedSlug,
      ),
    );
  }

  /**
   * No se utiliza todavía en los tests
   * de lectura del servicio.
   */
  create(): Promise<TipoPagoRecord> {
    throw new Error('Create no está configurado en este fake.');
  }

  /**
   * No se utiliza todavía en los tests
   * de lectura del servicio.
   */
  update(): Promise<TipoPagoRecord> {
    throw new Error('Update no está configurado en este fake.');
  }

  /**
   * No se utiliza todavía en los tests
   * de lectura del servicio.
   */
  deactivate(): Promise<void> {
    throw new Error('Deactivate no está configurado en este fake.');
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
  it('devuelve el maestro activo transformando las rutas de los logos', async (): Promise<void> => {
    const service: TiposPagoService = createService([
      createRecord(),
      createRecord({
        id: 2,
        publicId: 'tipo-pago-2',
        nombre: 'VISA',
        slug: 'visa',
        fotoRelativePath: 'files/payment-types/visa.webp',
        afectaCaja: false,
        orden: 1,
        fisico: true,
      }),
    ]);

    await expect(service.getAll()).resolves.toEqual([
      createInterface(),
      createInterface({
        id: 2,
        publicId: 'tipo-pago-2',
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
    const service: TiposPagoService = createService([createRecord()]);

    const result: readonly TipoPagoInterface[] = await service.getAll();

    expect(result).toEqual([createInterface()]);

    expect(result[0]?.slug).toBe('efectivo');

    expect(result[0]?.foto).toBeNull();
  });
});

function createService(tiposPago: readonly TipoPagoRecord[]): TiposPagoService {
  return new TiposPagoService(new FakeTipoPagoRepository(tiposPago), new FakeAssetUrlBuilder());
}

function createRecord(overrides: Partial<TipoPagoRecord> = {}): TipoPagoRecord {
  return {
    id: 1,
    publicId: 'tipo-pago-1',
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
