import type {
  InventarioDraftPatch,
  InventarioDraftValues,
} from '@model/almacen/inventario/inventario-draft.interface';
import InventarioPriceCalculator from '@model/almacen/inventario/inventario-price-calculator';
import { describe, expect, it } from 'vitest';

describe('InventarioPriceCalculator', (): void => {
  it('recalcula PUC y margen al editar Precio albarán sin cambiar PVP', (): void => {
    const draft: InventarioDraftValues = createDraft({
      precioAlbaranMicros: 17_000_000,
      pucMicros: 20_570_000,
      pvpCents: 3490,
      margenMicroporcentaje: 41_060_172,
    });

    expect(InventarioPriceCalculator.actualizarPrecioAlbaran(draft, 2100, 0, 17_520_000)).toEqual({
      precioAlbaranMicros: 17_520_000,
      pucMicros: 21_199_200,
      margenMicroporcentaje: 39_257_307,
    });
  });

  it('recalcula Precio albarán y margen al editar PUC sin cambiar PVP', (): void => {
    const draft: InventarioDraftValues = createDraft({
      pvpCents: 3490,
    });

    expect(InventarioPriceCalculator.actualizarPuc(draft, 2100, 0, 21_200_000)).toEqual({
      precioAlbaranMicros: 17_520_661,
      pucMicros: 21_200_000,
      margenMicroporcentaje: 39_255_014,
    });
  });

  it('recalcula únicamente el margen al editar PVP', (): void => {
    const draft: InventarioDraftValues = createDraft({
      precioAlbaranMicros: 17_520_000,
      pucMicros: 21_199_200,
      pvpCents: 3490,
    });

    expect(InventarioPriceCalculator.actualizarPvp(draft, 3990)).toEqual({
      pvpCents: 3990,
      margenMicroporcentaje: 46_869_173,
    });
  });
});

/**
 * Crea un draft válido para probar cálculos de Inventario.
 */
function createDraft(overrides: InventarioDraftPatch = {}): InventarioDraftValues {
  return {
    idsCategorias: [],
    stock: 1,
    precioAlbaranMicros: 17_520_000,
    pucMicros: 21_199_200,
    pvpCents: 3490,
    margenMicroporcentaje: 39_257_307,
    codigoAdicional: '',
    ...overrides,
  };
}
