import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import TiendaOnlineLineasMapper from '@backend/application/tienda-online/tienda-online-lineas.mapper';
import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type { TiendaOnlineLineaPedido } from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type { GuardarVentaLineaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';
import { describe, expect, it } from 'vitest';

/**
 * Repositorio de memoria para aislar el mapper de SQLite.
 */
class FakeArticulosRepository implements TiendaOnlineArticulosRepository {
  readonly articles: Map<number, ArticuloVentaRecord> = new Map<number, ArticuloVentaRecord>();

  readonly requested: number[] = [];

  /**
   * Recupera únicamente el artículo cuyo localizador coincide.
   */
  findByLocalizador(localizador: number): Promise<ArticuloVentaRecord | null> {
    this.requested.push(localizador);

    return Promise.resolve(this.articles.get(localizador) ?? null);
  }
}

/**
 * Crea un artículo del catálogo local con valores
 * deliberadamente diferentes a los de la tienda.
 */
function createArticle(localizador: number = 123): ArticuloVentaRecord {
  return {
    id: localizador,
    publicId: `articulo-${localizador}`,
    localizador,
    nombre: 'Nombre actual del TPV',
    marca: 'Marca actual del TPV',
    pucMicros: 4_000_000,
    pvpCents: 1_800,
    pvpDescuentoCents: null,
    ivaBps: 1_000,
    stock: 10,
    fechaCaducidad: null,
    observaciones: null,
    mostrarObservacionesVentas: false,
  };
}

/**
 * Construye una línea remota con dos unidades,
 * precio original de 27 euros y 2 euros de descuento.
 */
function createItem(overrides: Partial<TiendaOnlineLineaPedido> = {}): TiendaOnlineLineaPedido {
  return {
    productId: 57,
    sizeId: 0,
    colorId: 0,
    quantity: 2,
    name: 'Nombre histórico de la tienda',
    brand: 'Marca histórica de la tienda',
    localizador: '000123',
    ivaBps: 2_100,
    amountBeforeCents: 2_700,
    discountCents: 200,
    lineTotalCents: 2_500,
    ...overrides,
  };
}

/**
 * Construye el servicio real con un repositorio controlado.
 */
function createMapper(repository: FakeArticulosRepository): TiendaOnlineLineasMapper {
  return new TiendaOnlineLineasMapper(new TiendaOnlineArticuloResolver(repository));
}

describe('TiendaOnlineLineasMapper', (): void => {
  it('conserva los importes originales y el IVA histórico', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.articles.set(123, createArticle());

    const lineas = await createMapper(repository).map([createItem()]);

    expect(lineas).toEqual([
      {
        articuloPublicId: 'articulo-123',
        localizador: 123,
        marca: 'Marca histórica de la tienda',
        nombre: 'Nombre histórico de la tienda',
        pucMicros: 4_000_000,
        pvpMicros: 13_500_000,
        ivaBps: 2_100,
        importeMicros: 25_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 2_000_000,
        unidades: 2,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ]);

    expect(repository.requested).toEqual([123]);
  });

  it('mantiene el orden y la identidad de varias líneas', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    repository.articles.set(123, createArticle(123));
    repository.articles.set(456, createArticle(456));

    const lineas: readonly GuardarVentaLineaRecordCommand[] = await createMapper(repository).map([
      createItem(),
      createItem({
        productId: 58,
        localizador: '000456',
        quantity: 1,
        ivaBps: 1_000,
        amountBeforeCents: 700,
        discountCents: 0,
        lineTotalCents: 700,
      }),
    ]);

    expect(lineas).toHaveLength(2);
    expect(lineas.map((linea): number => linea.localizador)).toEqual([123, 456]);

    expect(lineas[1]).toMatchObject({
      articuloPublicId: 'articulo-456',
      pvpMicros: 7_000_000,
      importeMicros: 7_000_000,
      importeDescuentoMicros: 0,
      ivaBps: 1_000,
    });
  });

  it('representa un descuento completo sin inventar un regalo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.articles.set(123, createArticle());

    const lineas = await createMapper(repository).map([
      createItem({
        quantity: 1,
        amountBeforeCents: 1_000,
        discountCents: 1_000,
        lineTotalCents: 0,
      }),
    ]);

    expect(lineas[0]).toMatchObject({
      pvpMicros: 10_000_000,
      importeMicros: 0,
      importeDescuentoMicros: 10_000_000,
      regalo: false,
    });
  });

  it('rechaza snapshots comerciales incompletos', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.articles.set(123, createArticle());

    for (const overrides of [{ name: null }, { brand: null }, { ivaBps: null }]) {
      await expect(createMapper(repository).map([createItem(overrides)])).rejects.toThrow(
        'snapshots comerciales completos',
      );
    }

    expect(repository.requested).toEqual([]);
  });

  it('rechaza importes históricos ausentes', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    for (const overrides of [{ amountBeforeCents: null }, { discountCents: null }]) {
      await expect(createMapper(repository).map([createItem(overrides)])).rejects.toThrow(
        'importes históricos completos',
      );
    }
  });

  it('rechaza descuentos y totales inconsistentes', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(
      createMapper(repository).map([createItem({ discountCents: 300 })]),
    ).rejects.toThrow('Los importes históricos');

    await expect(
      createMapper(repository).map([
        createItem({
          amountBeforeCents: 100,
          discountCents: 200,
          lineTotalCents: 0,
        }),
      ]),
    ).rejects.toThrow('Los importes históricos');
  });

  it('rechaza precios unitarios que requerirían redondeo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(
      createMapper(repository).map([
        createItem({
          quantity: 3,
          amountBeforeCents: 1,
          discountCents: 0,
          lineTotalCents: 1,
        }),
      ]),
    ).rejects.toThrow('no se puede representar exactamente en microeuros');

    expect(repository.requested).toEqual([]);
  });

  it('rechaza importes superiores al rango seguro', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(
      createMapper(repository).map([
        createItem({
          quantity: 1,
          amountBeforeCents: Number.MAX_SAFE_INTEGER,
          discountCents: 0,
          lineTotalCents: Number.MAX_SAFE_INTEGER,
        }),
      ]),
    ).rejects.toThrow('supera el rango seguro de microeuros');
  });

  it('rechaza artículos que no existen en el TPV', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(createMapper(repository).map([createItem()])).rejects.toThrow(
      'No existe un artículo local con el localizador 000123.',
    );
  });

  it('rechaza localizadores históricos ausentes', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(createMapper(repository).map([createItem({ localizador: null })])).rejects.toThrow(
      'El localizador del artículo online no es válido.',
    );
  });

  it('rechaza pedidos sin líneas', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();

    await expect(createMapper(repository).map([])).rejects.toThrow(
      'El pedido online no contiene líneas comerciales.',
    );
  });
});
