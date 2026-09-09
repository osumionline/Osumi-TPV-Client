import type {
  InventarioDraftPatch,
  InventarioDraftValues,
} from '@model/almacen/inventario/inventario-draft.interface';
import ArticuloPriceCalculator from '@model/articulos/articulo-price-calculator';

/**
 * Aplica la cascada de precios específica de Inventario.
 */
export default class InventarioPriceCalculator {
  /**
   * Cambia Precio albarán y recalcula PUC y Margen manteniendo PVP.
   */
  static actualizarPrecioAlbaran(
    draft: InventarioDraftValues,
    ivaBps: number,
    reBps: number,
    precioAlbaranMicros: number,
  ): InventarioDraftPatch {
    const pucMicros: number = ArticuloPriceCalculator.calcularPucDesdePrecioAlbaran(
      precioAlbaranMicros,
      ivaBps,
      reBps,
    );

    return {
      precioAlbaranMicros,
      pucMicros,
      margenMicroporcentaje: ArticuloPriceCalculator.calcularMargenDesdePucYPvp(
        pucMicros,
        draft.pvpCents,
      ),
    };
  }

  /**
   * Cambia PUC y recalcula Precio albarán y Margen manteniendo PVP.
   */
  static actualizarPuc(
    draft: InventarioDraftValues,
    ivaBps: number,
    reBps: number,
    pucMicros: number,
  ): InventarioDraftPatch {
    return {
      precioAlbaranMicros: ArticuloPriceCalculator.calcularPrecioAlbaranDesdePuc(
        pucMicros,
        ivaBps,
        reBps,
      ),
      pucMicros,
      margenMicroporcentaje: ArticuloPriceCalculator.calcularMargenDesdePucYPvp(
        pucMicros,
        draft.pvpCents,
      ),
    };
  }

  /**
   * Cambia PVP y recalcula únicamente el Margen.
   */
  static actualizarPvp(draft: InventarioDraftValues, pvpCents: number): InventarioDraftPatch {
    return {
      pvpCents,
      margenMicroporcentaje: ArticuloPriceCalculator.calcularMargenDesdePucYPvp(
        draft.pucMicros,
        pvpCents,
      ),
    };
  }
}
