import ArticulosService from '@backend/application/articulos/articulos.service';
import type ArticulosRepository from '@backend/contracts/articulos/articulos.repository.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type { ArticuloRecord } from '@backend/domain/articulos/articulo-record.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import { describe, expect, it } from 'vitest';

class FakeArticulosRepository implements ArticulosRepository {
  record: ArticuloRecord | null = createArticuloRecord();
  resolvedId: number | null = 25;
  lastCode: string | null = null;
  lastNumericCode: number | null = null;

  /**
   * Devuelve el artículo configurado para el test.
   */
  findById(idArticulo: number): Promise<ArticuloRecord | null> {
    return Promise.resolve(this.record?.id === idArticulo ? this.record : null);
  }

  /**
   * Registra el código recibido y devuelve el id configurado.
   */
  resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null> {
    this.lastCode = codigo;
    this.lastNumericCode = codigoNumerico;

    return Promise.resolve(this.resolvedId);
  }
}

class FakeAssetUrlBuilder implements AssetUrlBuilder {
  /**
   * Convierte una ruta relativa en una URL predecible para el test.
   */
  build(relativePath: string | null): string | null {
    return relativePath === null ? null : `osumi-asset://${relativePath}`;
  }
}

describe('ArticulosService', (): void => {
  it('expone el detalle completo de un artículo', async (): Promise<void> => {
    const service = new ArticulosService(new FakeArticulosRepository(), new FakeAssetUrlBuilder());

    const articulo: ArticuloInterface | null = await service.getById(25);

    expect(articulo).toMatchObject({
      id: 25,
      localizador: 261234,
      nombre: 'Artículo de prueba',
      idsCategorias: [2, 7],
      ventaOnline: true,
      mostrarEnWeb: false,
    });

    expect(articulo?.codigosBarras).toHaveLength(2);
    expect(articulo?.fotos[0]?.url).toBe('osumi-asset://articles/25/photo.webp');
  });

  it('normaliza un localizador numérico antes de resolverlo', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = new ArticulosService(repository, new FakeAssetUrlBuilder());

    const articulo: ArticuloInterface | null = await service.resolveByCode(' 261234 ');

    expect(articulo?.id).toBe(25);
    expect(repository.lastCode).toBe('261234');
    expect(repository.lastNumericCode).toBe(261234);
  });

  it('trata un código alfanumérico exclusivamente como código de barras', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = new ArticulosService(repository, new FakeAssetUrlBuilder());

    await service.resolveByCode('ABC-123');

    expect(repository.lastCode).toBe('ABC-123');
    expect(repository.lastNumericCode).toBeNull();
  });

  it('no consulta el repository con un código vacío', async (): Promise<void> => {
    const repository = new FakeArticulosRepository();
    const service = new ArticulosService(repository, new FakeAssetUrlBuilder());

    const articulo: ArticuloInterface | null = await service.resolveByCode('   ');

    expect(articulo).toBeNull();
    expect(repository.lastCode).toBeNull();
  });
});

/**
 * Crea un artículo completo para los tests del servicio.
 */
function createArticuloRecord(): ArticuloRecord {
  return {
    id: 25,
    publicId: 'article-public-id',
    localizador: 261234,
    nombre: 'Artículo de prueba',
    idMarca: 3,
    idProveedor: 4,
    idsCategorias: [2, 7],
    referencia: 'REF-25',
    precioAlbaranMicros: 590000,
    pucMicros: 744580,
    pvpCents: 100,
    pvpDescuentoCents: 90,
    ivaBps: 2100,
    reBps: 520,
    margenMicroporcentaje: 255420,
    margenDescuentoMicroporcentaje: 172689,
    stock: 8,
    stockMin: 2,
    stockMax: 20,
    loteOptimo: 5,
    ventaOnline: true,
    mostrarEnWeb: false,
    descripcionCorta: 'Descripción corta',
    descripcionLarga: 'Descripción larga',
    observaciones: 'Observaciones',
    mostrarObservacionesPedidos: true,
    mostrarObservacionesVentas: false,
    accesoDirecto: 12,
    codigosBarras: [
      {
        id: 100,
        publicId: 'barcode-default',
        codigo: '261234',
        porDefecto: true,
      },
      {
        id: 101,
        publicId: 'barcode-extra',
        codigo: 'ABC-123',
        porDefecto: false,
      },
    ],
    fotos: [
      {
        id: 200,
        publicId: 'photo-public-id',
        originalName: 'photo.jpg',
        relativePath: 'articles/25/photo.webp',
        mimeType: 'image/webp',
        sizeBytes: 12345,
        width: 800,
        height: 800,
        orden: 0,
        principal: true,
      },
    ],
  };
}
