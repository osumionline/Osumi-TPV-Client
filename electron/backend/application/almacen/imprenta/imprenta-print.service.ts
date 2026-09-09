import type ImprentaPrintProvider from '@backend/contracts/almacen/imprenta/imprenta-print-provider.interface';
import type ImprentaPrintWindow from '@backend/contracts/almacen/imprenta/imprenta-print-window.interface';
import {
  IMPRENTA_MAX_COLUMNS,
  IMPRENTA_MAX_ROWS,
  type ImprentaOrientation,
  type ImprentaPrintArticuloInterface,
  type ImprentaPrintCommand,
  type ImprentaPrintDocumentoInterface,
  type ImprentaPrintItemCommand,
  type ImprentaPrintSlotInterface,
} from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';

/**
 * Valida un diseño de etiquetas, relee sus artículos
 * y materializa el snapshot canónico de una única hoja A4.
 */
export default class ImprentaPrintService {
  constructor(
    private readonly printProvider: ImprentaPrintProvider,
    private readonly printWindow: ImprentaPrintWindow,
  ) {}

  /**
   * Valida, materializa y abre el diseño solicitado.
   */
  async open(command: ImprentaPrintCommand): Promise<void> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('El diseño de Imprenta no es válido.');
    }

    const filas: number = this.validateDimension(
      command.filas,
      IMPRENTA_MAX_ROWS,
      'El número de filas de Imprenta no es válido.',
    );
    const columnas: number = this.validateDimension(
      command.columnas,
      IMPRENTA_MAX_COLUMNS,
      'El número de columnas de Imprenta no es válido.',
    );
    const orientacion: ImprentaOrientation = this.validateOrientation(command.orientacion);

    if (typeof command.mostrarPvp !== 'boolean') {
      throw new Error('La opción Mostrar PVP de Imprenta no es válida.');
    }
    if (!Array.isArray(command.items) || command.items.length === 0) {
      throw new Error('El diseño de Imprenta está vacío.');
    }

    const capacity: number = filas * columnas;
    const normalizedItems: ImprentaPrintItemCommand[] = [];
    const articleIds: number[] = [];
    const uniqueArticleIds: Set<number> = new Set<number>();
    let totalSlots: number = 0;

    for (const rawItem of command.items as readonly unknown[]) {
      if (typeof rawItem !== 'object' || rawItem === null) {
        throw new Error('Uno de los elementos del diseño de Imprenta no es válido.');
      }

      const item: {
        readonly tipo?: unknown;
        readonly idArticulo?: unknown;
        readonly cantidad?: unknown;
      } = rawItem;

      if (item.tipo === 'hueco') {
        normalizedItems.push({
          tipo: 'hueco',
        });
        totalSlots++;

        continue;
      }

      if (item.tipo !== 'articulo') {
        throw new Error('Uno de los elementos del diseño de Imprenta no es válido.');
      }
      if (
        typeof item.idArticulo !== 'number' ||
        !Number.isSafeInteger(item.idArticulo) ||
        item.idArticulo <= 0
      ) {
        throw new Error('Uno de los artículos del diseño de Imprenta no es válido.');
      }
      if (
        typeof item.cantidad !== 'number' ||
        !Number.isSafeInteger(item.cantidad) ||
        item.cantidad <= 0
      ) {
        throw new Error('Una de las cantidades del diseño de Imprenta no es válida.');
      }
      if (uniqueArticleIds.has(item.idArticulo)) {
        throw new Error('Hay artículos repetidos en el diseño de Imprenta.');
      }

      uniqueArticleIds.add(item.idArticulo);
      articleIds.push(item.idArticulo);
      totalSlots += item.cantidad;

      normalizedItems.push({
        tipo: 'articulo',
        idArticulo: item.idArticulo,
        cantidad: item.cantidad,
      });
    }

    if (articleIds.length === 0) {
      throw new Error('El diseño de Imprenta debe contener al menos un artículo.');
    }
    if (!Number.isSafeInteger(totalSlots) || totalSlots > capacity) {
      throw new Error('El diseño de Imprenta supera la capacidad de la hoja.');
    }

    const canonicalArticles: readonly ImprentaPrintArticuloInterface[] =
      await this.printProvider.getImprentaPrintArticulos(articleIds);

    if (canonicalArticles.length !== articleIds.length) {
      throw new Error(
        'Uno de los artículos del diseño ya no está disponible. Revisa el diseño antes de continuar.',
      );
    }

    const articlesById: ReadonlyMap<number, ImprentaPrintArticuloInterface> = new Map<
      number,
      ImprentaPrintArticuloInterface
    >(
      canonicalArticles.map(
        (
          article: ImprentaPrintArticuloInterface,
        ): readonly [number, ImprentaPrintArticuloInterface] => [article.idArticulo, article],
      ),
    );

    const slots: ImprentaPrintSlotInterface[] = [];

    for (const item of normalizedItems) {
      if (item.tipo === 'hueco') {
        slots.push({
          tipo: 'hueco',
          articulo: null,
        });

        continue;
      }

      const article: ImprentaPrintArticuloInterface | undefined = articlesById.get(item.idArticulo);

      if (article === undefined) {
        throw new Error(
          'Uno de los artículos del diseño ya no está disponible. Revisa el diseño antes de continuar.',
        );
      }

      for (let index: number = 0; index < item.cantidad; index++) {
        slots.push({
          tipo: 'articulo',
          articulo: article,
        });
      }
    }

    while (slots.length < capacity) {
      slots.push({
        tipo: 'libre',
        articulo: null,
      });
    }

    const documento: ImprentaPrintDocumentoInterface = {
      filas,
      columnas,
      orientacion,
      mostrarPvp: command.mostrarPvp,
      slots,
    };

    await this.printWindow.open(documento);
  }

  /**
   * Valida una dimensión de la hoja.
   */
  private validateDimension(value: unknown, maximum: number, message: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
      throw new Error(message);
    }

    return value;
  }

  /**
   * Valida la orientación A4 solicitada.
   */
  private validateOrientation(value: unknown): ImprentaOrientation {
    if (value !== 'portrait' && value !== 'landscape') {
      throw new Error('La orientación de Imprenta no es válida.');
    }

    return value;
  }
}
