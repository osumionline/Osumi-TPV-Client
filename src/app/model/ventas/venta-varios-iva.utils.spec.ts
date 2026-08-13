import {
  getDefaultVariosIvaBps,
  getVariosIvaOptionsBps,
} from '@model/ventas/venta-varios-iva.utils';

describe('venta-varios-iva.utils', (): void => {
  it('elige el 21 % cuando está configurado aunque exista un IVA superior', (): void => {
    expect(getDefaultVariosIvaBps([4, 10, 21, 25])).toBe(2_100);
  });

  it('elige el IVA más alto cuando no está configurado el 21 %', (): void => {
    expect(getDefaultVariosIvaBps([4, 10, 15])).toBe(1_500);
  });

  it('permite IVA cero', (): void => {
    expect(getDefaultVariosIvaBps([0, 4])).toBe(400);
  });

  it('convierte los IVA configurados a puntos básicos', (): void => {
    expect(getVariosIvaOptionsBps([4, 10, 21])).toEqual([400, 1_000, 2_100]);
  });

  it('rechaza una configuración sin tipos de IVA', (): void => {
    expect((): number => getDefaultVariosIvaBps([])).toThrow(
      'No hay ningún tipo de IVA configurado.',
    );
  });
});
