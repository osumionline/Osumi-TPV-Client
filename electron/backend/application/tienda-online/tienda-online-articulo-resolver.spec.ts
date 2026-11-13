import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import type TiendaOnlineArticulosRepository from '@backend/contracts/tienda-online/tienda-online-articulos.repository.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';
import { describe, expect, it } from 'vitest';

/**
 * Repositorio controlado que permite comprobar
 * qué localizador solicita el resolver.
 */
class FakeArticulosRepository implements TiendaOnlineArticulosRepository {
  readonly requested: number[] = [];

  result: ArticuloVentaRecord | null = null;

  /**
   * Devuelve el artículo configurado para cada prueba.
   */
  findByLocalizador(localizador: number): Promise<ArticuloVentaRecord | null> {
    this.requested.push(localizador);
    return Promise.resolve(this.result);
  }
}

/**
 * Crea un artículo local válido para las pruebas.
 */
function createArticle(): ArticuloVentaRecord {
  return {
    id: 10,
    publicId: 'articulo-10',
    localizador: 123,
    nombre: 'Artículo de prueba',
    marca: 'Marca de prueba',
    pucMicros: 500_000,
    pvpCents: 1_250,
    pvpDescuentoCents: null,
    ivaBps: 2_100,
    stock: 5,
    fechaCaducidad: null,
    observaciones: null,
    mostrarObservacionesVentas: false,
  };
}

describe('TiendaOnlineArticuloResolver', (): void => {
  it('resuelve un localizador numérico válido', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.result = createArticle();

    const resolver = new TiendaOnlineArticuloResolver(repository);

    const article = await resolver.resolve('123');

    expect(article.publicId).toBe('articulo-10');
    expect(repository.requested).toEqual([123]);
  });

  it('admite ceros iniciales sin cambiar la identidad', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.result = createArticle();

    const resolver = new TiendaOnlineArticuloResolver(repository);

    const article = await resolver.resolve('000123');

    expect(article.localizador).toBe(123);
    expect(repository.requested).toEqual([123]);
  });

  it('rechaza localizadores ausentes o no numéricos', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const resolver = new TiendaOnlineArticuloResolver(repository);

    for (const localizador of [
      null,
      '',
      'ABC123',
      '12.3',
      '1e2',
      ' 123 ',
      '0',
      '-1',
      '9007199254740992',
    ]) {
      await expect(resolver.resolve(localizador)).rejects.toThrow(
        'El localizador del artículo online no es válido.',
      );
    }

    expect(repository.requested).toEqual([]);
  });

  it('rechaza artículos inexistentes', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const resolver = new TiendaOnlineArticuloResolver(repository);

    await expect(resolver.resolve('999')).rejects.toThrow(
      'No existe un artículo local con el localizador 999.',
    );

    expect(repository.requested).toEqual([999]);
  });

  it('rechaza resultados con localizador diferente', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    repository.result = createArticle();

    const resolver = new TiendaOnlineArticuloResolver(repository);

    await expect(resolver.resolve('456')).rejects.toThrow(
      'El artículo recuperado no corresponde al localizador solicitado.',
    );
  });
});
