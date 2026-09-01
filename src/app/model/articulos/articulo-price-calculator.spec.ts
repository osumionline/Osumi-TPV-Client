import type { ArticuloDraft, ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import { createEmptyArticuloDraft } from '@model/articulos/articulo-draft.utils';
import ArticuloPriceCalculator from '@model/articulos/articulo-price-calculator';
import { describe, expect, it } from 'vitest';

describe('ArticuloPriceCalculator', (): void => {
  it('recalculates PUC and PVP when purchase price changes while preserving margin', (): void => {
    const draft: ArticuloDraft = createDraft();

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarPrecioAlbaran(
      draft,
      590_000,
    );

    expect(patch).toEqual({
      precioAlbaranMicros: 590_000,
      pucMicros: 744_580,
      pvpCents: 101,
    });
  });

  it('recalculates purchase price and PVP when PUC changes while preserving margin', (): void => {
    const draft: ArticuloDraft = createDraft();

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarPuc(draft, 744_580);

    expect(patch).toEqual({
      precioAlbaranMicros: 590_000,
      pucMicros: 744_580,
      pvpCents: 101,
    });
  });

  it('recalculates margin when PVP changes', (): void => {
    const draft: ArticuloDraft = createDraft({
      pucMicros: 740_000,
    });

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarPvp(draft, 100);

    expect(patch).toEqual({
      pvpCents: 100,
      margenMicroporcentaje: 26_000_000,
    });
  });

  it('recalculates PVP when margin changes', (): void => {
    const draft: ArticuloDraft = createDraft({
      pucMicros: 740_000,
    });

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarMargen(draft, 26_000_000);

    expect(patch).toEqual({
      margenMicroporcentaje: 26_000_000,
      pvpCents: 100,
    });
  });

  it('updates the fiscal pair atomically and recalculates PUC and PVP', (): void => {
    const draft: ArticuloDraft = createDraft({
      precioAlbaranMicros: 590_000,
    });

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarFiscalidad(
      draft,
      1000,
      140,
    );

    expect(patch).toEqual({
      ivaBps: 1000,
      reBps: 140,
      pucMicros: 657_260,
      pvpCents: 89,
    });
  });

  it('supports a negative margin when PVP is below PUC', (): void => {
    const draft: ArticuloDraft = createDraft({
      pucMicros: 1_200_000,
    });

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarPvp(draft, 100);

    expect(patch).toEqual({
      pvpCents: 100,
      margenMicroporcentaje: -20_000_000,
    });
  });

  it('uses zero margin when PVP is zero', (): void => {
    const draft: ArticuloDraft = createDraft({
      pucMicros: 1_200_000,
      margenMicroporcentaje: 25_000_000,
    });

    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarPvp(draft, 0);

    expect(patch).toEqual({
      pvpCents: 0,
      margenMicroporcentaje: 0,
    });
  });

  it('requires fiscal data to derive PUC from purchase price', (): void => {
    const draft: ArticuloDraft = createDraft({
      ivaBps: null,
      reBps: null,
    });

    expect((): ArticuloDraftPatch =>
      ArticuloPriceCalculator.actualizarPrecioAlbaran(draft, 590_000),
    ).toThrow('Es necesario seleccionar la fiscalidad antes de calcular precios.');
  });

  it('rejects margins equal to or greater than one hundred percent', (): void => {
    const draft: ArticuloDraft = createDraft({
      pucMicros: 740_000,
    });

    expect((): ArticuloDraftPatch =>
      ArticuloPriceCalculator.actualizarMargen(draft, 100_000_000),
    ).toThrow('El margen debe ser inferior al 100 % para calcular el PVP.');
  });
});

/**
 * Crea un draft coherente para las pruebas del motor de precios.
 */
function createDraft(overrides: ArticuloDraftPatch = {}): ArticuloDraft {
  return {
    ...createEmptyArticuloDraft(),
    precioAlbaranMicros: 590_000,
    pucMicros: 744_580,
    pvpCents: 101,
    ivaBps: 2100,
    reBps: 520,
    margenMicroporcentaje: 26_000_000,
    ...overrides,
  };
}
