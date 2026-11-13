import TiendaOnlineArticuloResolver from '@backend/application/tienda-online/tienda-online-articulo-resolver';
import type { TiendaOnlineLineaPedido } from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type { GuardarVentaLineaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type { ArticuloVentaRecord } from '@backend/domain/ventas/articulo-venta-record.interface';

const MICROS_PER_CENT: number = 10_000;

/**
 * Transforma las líneas comerciales de una tienda online
 * al contrato interno de persistencia de ventas del TPV.
 *
 * No consulta precios actuales para reconstruir la venta,
 * no modifica stock y no persiste datos.
 */
export default class TiendaOnlineLineasMapper {
  constructor(private readonly articuloResolver: TiendaOnlineArticuloResolver) {}

  /**
   * Transforma todas las líneas manteniendo su orden original.
   *
   * Ante cualquier línea inválida se rechaza el pedido completo.
   */
  async map(
    items: readonly TiendaOnlineLineaPedido[],
  ): Promise<readonly GuardarVentaLineaRecordCommand[]> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('El pedido online no contiene líneas comerciales.');
    }

    const result: GuardarVentaLineaRecordCommand[] = [];

    for (const item of items) {
      result.push(await this.mapItem(item));
    }

    return result;
  }

  /**
   * Construye una línea normalizada utilizando exclusivamente
   * los importes originales y la identidad local del artículo.
   */
  private async mapItem(item: TiendaOnlineLineaPedido): Promise<GuardarVentaLineaRecordCommand> {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('La cantidad de la línea online no es válida.');
    }

    if (
      item.name === null ||
      item.name.trim() === '' ||
      item.name.length > 200 ||
      item.brand === null ||
      item.brand.trim() === '' ||
      item.brand.length > 100 ||
      item.ivaBps === null
    ) {
      throw new Error('La línea online no dispone de snapshots comerciales completos.');
    }

    if (!Number.isSafeInteger(item.ivaBps) || item.ivaBps < 0 || item.ivaBps > 10_000) {
      throw new Error('El IVA histórico de la línea online no es válido.');
    }

    const beforeCents: number | null = item.amountBeforeCents;
    const discountCents: number | null = item.discountCents;
    const afterCents: number = item.lineTotalCents;

    if (beforeCents === null || discountCents === null) {
      throw new Error('La línea online no dispone de importes históricos completos.');
    }

    if (
      !this.isNonNegativeSafeInteger(beforeCents) ||
      !this.isNonNegativeSafeInteger(discountCents) ||
      !this.isNonNegativeSafeInteger(afterCents) ||
      discountCents > beforeCents ||
      beforeCents - discountCents !== afterCents
    ) {
      throw new Error('Los importes históricos de la línea online no cuadran.');
    }

    const beforeMicros: number = this.centsToMicros(beforeCents);
    const discountMicros: number = this.centsToMicros(discountCents);
    const afterMicros: number = this.centsToMicros(afterCents);

    /*
     * El TPV guarda un PVP unitario entero en microeuros.
     * No inventamos redondeos que modifiquen el precio
     * teórico o introduzcan descuentos inexistentes.
     */
    if (beforeMicros % item.quantity !== 0) {
      throw new Error(
        'El precio unitario online no se puede representar exactamente en microeuros.',
      );
    }

    const pvpMicros: number = beforeMicros / item.quantity;

    const article: ArticuloVentaRecord = await this.articuloResolver.resolve(item.localizador);

    if (!this.isNonNegativeSafeInteger(article.pucMicros)) {
      throw new Error('El coste local del artículo online no es válido.');
    }

    return {
      articuloPublicId: article.publicId,
      localizador: article.localizador,
      marca: item.brand,
      nombre: item.name,

      pucMicros: article.pucMicros,
      pvpMicros,
      ivaBps: item.ivaBps,
      importeMicros: afterMicros,

      descuentoBps: 0,
      importeDescuentoMicros: discountMicros,

      unidades: item.quantity,
      regalo: false,

      devolucionLineaOrigenPublicId: null,
      reservaLineaOrigenPublicId: null,
    };
  }

  /**
   * Comprueba que un importe entero es seguro y no negativo.
   */
  private isNonNegativeSafeInteger(value: number): boolean {
    return Number.isSafeInteger(value) && value >= 0;
  }

  /**
   * Convierte céntimos a microeuros sin perder precisión.
   */
  private centsToMicros(cents: number): number {
    const result: number = cents * MICROS_PER_CENT;

    if (!this.isNonNegativeSafeInteger(result)) {
      throw new Error('El importe de la línea online supera el rango seguro de microeuros.');
    }

    return result;
  }
}
