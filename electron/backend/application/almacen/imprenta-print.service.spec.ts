import ImprentaPrintService from '@backend/application/almacen/imprenta-print.service';
import type ImprentaPrintProvider from '@backend/contracts/almacen/imprenta/imprenta-print-provider.interface';
import type ImprentaPrintWindow from '@backend/contracts/almacen/imprenta/imprenta-print-window.interface';
import type {
  ImprentaPrintArticuloInterface,
  ImprentaPrintCommand,
  ImprentaPrintDocumentoInterface,
} from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';
import { describe, expect, it } from 'vitest';

class FakeImprentaPrintProvider implements ImprentaPrintProvider {
  lastIdsArticulos: readonly number[] | null = null;
  result: readonly ImprentaPrintArticuloInterface[] = [
    {
      idArticulo: 2,
      localizador: 261002,
      marcaNombre: 'Marca Dos',
      nombre: 'Artículo Beta actualizado',
      pvpCents: 350,
    },
    {
      idArticulo: 1,
      localizador: 261001,
      marcaNombre: 'Marca Uno',
      nombre: 'Artículo Alfa actualizado',
      pvpCents: 425,
    },
  ];

  /**
   * Conserva los identificadores solicitados y devuelve
   * únicamente los artículos canónicos correspondientes.
   */
  getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloInterface[]> {
    this.lastIdsArticulos = [...idsArticulos];

    return Promise.resolve(
      this.result.filter((article: ImprentaPrintArticuloInterface): boolean =>
        idsArticulos.includes(article.idArticulo),
      ),
    );
  }
}

class FakeImprentaPrintWindow implements ImprentaPrintWindow {
  lastDocumento: ImprentaPrintDocumentoInterface | null = null;

  /**
   * Conserva el snapshot recibido para su comprobación.
   */
  open(documento: ImprentaPrintDocumentoInterface): Promise<void> {
    this.lastDocumento = documento;

    return Promise.resolve();
  }

  /**
   * Devuelve el documento previamente abierto.
   */
  getDocumento(): ImprentaPrintDocumentoInterface {
    if (this.lastDocumento === null) {
      throw new Error('No hay hoja de Imprenta abierta.');
    }

    return this.lastDocumento;
  }

  /**
   * Simula la impresión de la BrowserWindow.
   */
  print(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ImprentaPrintService', (): void => {
  it('materializa una única hoja respetando orden, cantidades, huecos y libres', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);
    const command: ImprentaPrintCommand = {
      filas: 2,
      columnas: 3,
      orientacion: 'portrait',
      mostrarPvp: true,
      items: [
        {
          tipo: 'articulo',
          idArticulo: 2,
          cantidad: 2,
        },
        {
          tipo: 'hueco',
        },
        {
          tipo: 'articulo',
          idArticulo: 1,
          cantidad: 1,
        },
      ],
    };

    await service.open(command);

    expect(provider.lastIdsArticulos).toEqual([2, 1]);

    expect(printWindow.lastDocumento).toEqual({
      filas: 2,
      columnas: 3,
      orientacion: 'portrait',
      mostrarPvp: true,
      slots: [
        {
          tipo: 'articulo',
          articulo: {
            idArticulo: 2,
            localizador: 261002,
            marcaNombre: 'Marca Dos',
            nombre: 'Artículo Beta actualizado',
            pvpCents: 350,
          },
        },
        {
          tipo: 'articulo',
          articulo: {
            idArticulo: 2,
            localizador: 261002,
            marcaNombre: 'Marca Dos',
            nombre: 'Artículo Beta actualizado',
            pvpCents: 350,
          },
        },
        {
          tipo: 'hueco',
          articulo: null,
        },
        {
          tipo: 'articulo',
          articulo: {
            idArticulo: 1,
            localizador: 261001,
            marcaNombre: 'Marca Uno',
            nombre: 'Artículo Alfa actualizado',
            pvpCents: 425,
          },
        },
        {
          tipo: 'libre',
          articulo: null,
        },
        {
          tipo: 'libre',
          articulo: null,
        },
      ],
    });
  });

  it('conserva la orientación horizontal y la opción de ocultar PVP', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    await service.open({
      filas: 1,
      columnas: 2,
      orientacion: 'landscape',
      mostrarPvp: false,
      items: [
        {
          tipo: 'articulo',
          idArticulo: 2,
          cantidad: 1,
        },
      ],
    });

    expect(printWindow.lastDocumento?.orientacion).toBe('landscape');
    expect(printWindow.lastDocumento?.mostrarPvp).toBe(false);
    expect(printWindow.lastDocumento?.slots).toHaveLength(2);
  });

  it('rechaza un diseño que supera la capacidad de la hoja', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    await expect(
      service.open({
        filas: 2,
        columnas: 2,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 5,
          },
        ],
      }),
    ).rejects.toThrow('El diseño de Imprenta supera la capacidad de la hoja.');

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza artículos repetidos en distintos bloques del diseño', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    await expect(
      service.open({
        filas: 2,
        columnas: 3,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 1,
          },
          {
            tipo: 'hueco',
          },
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 1,
          },
        ],
      }),
    ).rejects.toThrow('Hay artículos repetidos en el diseño de Imprenta.');

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza un diseño formado exclusivamente por huecos', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    await expect(
      service.open({
        filas: 2,
        columnas: 2,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'hueco',
          },
          {
            tipo: 'hueco',
          },
        ],
      }),
    ).rejects.toThrow('El diseño de Imprenta debe contener al menos un artículo.');

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza el documento completo si uno de los artículos ya no está disponible', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    provider.result = [
      {
        idArticulo: 2,
        localizador: 261002,
        marcaNombre: 'Marca Dos',
        nombre: 'Artículo Beta actualizado',
        pvpCents: 350,
      },
    ];

    await expect(
      service.open({
        filas: 2,
        columnas: 2,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 1,
          },
          {
            tipo: 'articulo',
            idArticulo: 1,
            cantidad: 1,
          },
        ],
      }),
    ).rejects.toThrow(
      'Uno de los artículos del diseño ya no está disponible. Revisa el diseño antes de continuar.',
    );

    expect(provider.lastIdsArticulos).toEqual([2, 1]);
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza dimensiones superiores a los máximos permitidos', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);

    await expect(
      service.open({
        filas: 11,
        columnas: 4,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 1,
          },
        ],
      }),
    ).rejects.toThrow('El número de filas de Imprenta no es válido.');

    await expect(
      service.open({
        filas: 5,
        columnas: 11,
        orientacion: 'portrait',
        mostrarPvp: true,
        items: [
          {
            tipo: 'articulo',
            idArticulo: 2,
            cantidad: 1,
          },
        ],
      }),
    ).rejects.toThrow('El número de columnas de Imprenta no es válido.');

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza una orientación no soportada', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);
    const command: ImprentaPrintCommand = {
      filas: 5,
      columnas: 4,
      orientacion: 'diagonal',
      mostrarPvp: true,
      items: [
        {
          tipo: 'articulo',
          idArticulo: 2,
          cantidad: 1,
        },
      ],
    } as unknown as ImprentaPrintCommand;

    await expect(service.open(command)).rejects.toThrow('La orientación de Imprenta no es válida.');

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });

  it('rechaza cantidades no positivas', async (): Promise<void> => {
    const provider = new FakeImprentaPrintProvider();
    const printWindow = new FakeImprentaPrintWindow();
    const service = new ImprentaPrintService(provider, printWindow);
    const command: ImprentaPrintCommand = {
      filas: 5,
      columnas: 4,
      orientacion: 'portrait',
      mostrarPvp: true,
      items: [
        {
          tipo: 'articulo',
          idArticulo: 2,
          cantidad: 0,
        },
      ],
    };

    await expect(service.open(command)).rejects.toThrow(
      'Una de las cantidades del diseño de Imprenta no es válida.',
    );

    expect(provider.lastIdsArticulos).toBeNull();
    expect(printWindow.lastDocumento).toBeNull();
  });
});
