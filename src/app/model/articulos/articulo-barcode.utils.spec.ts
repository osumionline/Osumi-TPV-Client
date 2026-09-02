import {
  appendArticuloBarcode,
  removeArticuloBarcode,
  validateArticuloBarcodes,
} from '@model/articulos/articulo-barcode.utils';
import { describe, expect, it } from 'vitest';

describe('articulo-barcode.utils', (): void => {
  it('adds a normalized additional barcode', (): void => {
    expect(appendArticuloBarcode([], ' 8437012345678 ')).toEqual([
      {
        id: null,
        codigo: '8437012345678',
      },
    ]);
  });

  it('ignores an empty barcode when adding it', (): void => {
    expect(appendArticuloBarcode([], '   ')).toEqual([]);
  });

  it('removes an additional barcode', (): void => {
    expect(
      removeArticuloBarcode(
        [
          {
            id: 10,
            codigo: 'A',
          },
          {
            id: 20,
            codigo: 'B',
          },
        ],
        0,
      ),
    ).toEqual([
      {
        id: 20,
        codigo: 'B',
      },
    ]);
  });

  it('detects repeated barcodes', (): void => {
    expect(
      validateArticuloBarcodes(
        [
          {
            id: null,
            codigo: 'ABC',
          },
          {
            id: null,
            codigo: 'ABC',
          },
        ],
        null,
        null,
      ),
    ).toBe('El código "ABC" está repetido en el artículo.');
  });

  it('detects a barcode matching the localizer', (): void => {
    expect(
      validateArticuloBarcodes(
        [
          {
            id: null,
            codigo: '231410',
          },
        ],
        231410,
        null,
      ),
    ).toBe('Un código adicional no puede coincidir con el localizador.');
  });

  it('detects a barcode matching the direct access', (): void => {
    expect(
      validateArticuloBarcodes(
        [
          {
            id: null,
            codigo: '7',
          },
        ],
        231410,
        7,
      ),
    ).toBe('Un código adicional no puede coincidir con el acceso directo.');
  });

  it('accepts alphanumeric barcodes', (): void => {
    expect(
      validateArticuloBarcodes(
        [
          {
            id: null,
            codigo: 'ABC-123',
          },
        ],
        231410,
        7,
      ),
    ).toBeNull();
  });
});
