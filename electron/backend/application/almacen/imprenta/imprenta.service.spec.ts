import ImprentaService from '@backend/application/almacen/imprenta/imprenta.service';
import type ImprentaRepository from '@backend/contracts/almacen/imprenta/imprenta.repository.interface';
import type ImprentaArticuloSearchRecord from '@backend/domain/almacen/imprenta/imprenta-articulo-search-record.interface';
import type ImprentaPrintArticuloRecord from '@backend/domain/almacen/imprenta/imprenta-print-articulo-record.interface';
import type {
  ImprentaArticuloSearchConsulta,
  ImprentaArticuloSearchInterface,
} from '@desktop-contracts/almacen/imprenta/imprenta-articulo.interface';
import type { ImprentaPrintArticuloInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';
import { describe, expect, it } from 'vitest';

class FakeImprentaRepository implements ImprentaRepository {
  lastSearch: {
    readonly texto: string;
    readonly idsArticulosExcluidos: readonly number[];
  } | null = null;

  lastPrintIds: readonly number[] | null = null;

  searchResult: readonly ImprentaArticuloSearchRecord[] = [
    {
      id: 25,
      localizador: 261234,
      marcaNombre: 'Marca de prueba',
      nombre: 'Artículo de prueba',
      pvpCents: 1690,
    },
  ];

  printResult: readonly ImprentaPrintArticuloRecord[] = [
    {
      idArticulo: 25,
      localizador: 261234,
      marcaNombre: 'Marca de prueba',
      nombre: 'Artículo de prueba actualizado',
      pvpCents: 1790,
    },
  ];

  searchImprentaArticulos(
    texto: string,
    idsArticulosExcluidos: readonly number[],
  ): Promise<readonly ImprentaArticuloSearchRecord[]> {
    this.lastSearch = {
      texto,
      idsArticulosExcluidos: [...idsArticulosExcluidos],
    };

    return Promise.resolve(this.searchResult);
  }

  getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloRecord[]> {
    this.lastPrintIds = [...idsArticulos];

    return Promise.resolve(this.printResult);
  }
}

describe('ImprentaService', (): void => {
  it('normaliza la búsqueda y exclusiones', async (): Promise<void> => {
    const repository = new FakeImprentaRepository();
    const service = new ImprentaService(repository);
    const consulta: ImprentaArticuloSearchConsulta = {
      texto: '  artículo  ',
      idsArticulosExcluidos: [9, 3, 9],
    };

    const result: readonly ImprentaArticuloSearchInterface[] =
      await service.searchImprentaArticulos(consulta);

    expect(repository.lastSearch).toEqual({
      texto: 'artículo',
      idsArticulosExcluidos: [3, 9],
    });

    expect(result).toEqual([
      {
        id: 25,
        localizador: 261234,
        marcaNombre: 'Marca de prueba',
        nombre: 'Artículo de prueba',
        pvpCents: 1690,
      },
    ]);
  });

  it('no consulta el repository con una búsqueda vacía', async (): Promise<void> => {
    const repository = new FakeImprentaRepository();
    const service = new ImprentaService(repository);

    const result = await service.searchImprentaArticulos({
      texto: '   ',
      idsArticulosExcluidos: [],
    });

    expect(result).toEqual([]);
    expect(repository.lastSearch).toBeNull();
  });

  it('rechaza identificadores excluidos no válidos', async (): Promise<void> => {
    const repository = new FakeImprentaRepository();
    const service = new ImprentaService(repository);

    await expect(
      service.searchImprentaArticulos({
        texto: 'artículo',
        idsArticulosExcluidos: [0],
      }),
    ).rejects.toThrow('Uno de los artículos excluidos de Imprenta no es válido.');

    expect(repository.lastSearch).toBeNull();
  });

  it('expone los datos canónicos actuales para impresión', async (): Promise<void> => {
    const repository = new FakeImprentaRepository();
    const service = new ImprentaService(repository);

    const result: readonly ImprentaPrintArticuloInterface[] =
      await service.getImprentaPrintArticulos([25]);

    expect(repository.lastPrintIds).toEqual([25]);

    expect(result).toEqual([
      {
        idArticulo: 25,
        localizador: 261234,
        marcaNombre: 'Marca de prueba',
        nombre: 'Artículo de prueba actualizado',
        pvpCents: 1790,
      },
    ]);
  });
});
