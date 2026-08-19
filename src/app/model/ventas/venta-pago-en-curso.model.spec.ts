import TipoPago from '@model/tipos-pago/tipo-pago.model';
import VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';

const createTipoPago = (publicId: string, slug: string, nombre: string): TipoPago => {
  const tipoPago: TipoPago = new TipoPago();

  tipoPago.id = 1;
  tipoPago.publicId = publicId;
  tipoPago.slug = slug;
  tipoPago.nombre = nombre;

  return tipoPago;
};

describe('VentaPagoEnCurso', (): void => {
  it('crea un pago exacto en efectivo', (): void => {
    const efectivo: TipoPago = createTipoPago('tipo-pago-efectivo', 'efectivo', 'Efectivo');

    const pago: VentaPagoEnCurso = new VentaPagoEnCurso(efectivo, 2_000);

    expect(pago.tipoPago).toBe(efectivo);
    expect(pago.tipoPagoPublicId).toBe('tipo-pago-efectivo');
    expect(pago.esEfectivo).toBe(true);
    expect(pago.importeCents).toBe(2_000);
    expect(pago.entregadoCents).toBe(2_000);
    expect(pago.cambioCents).toBe(0);
  });

  it('calcula el cambio de un pago en efectivo', (): void => {
    const efectivo: TipoPago = createTipoPago('tipo-pago-efectivo', 'efectivo', 'Efectivo');

    const pago: VentaPagoEnCurso = new VentaPagoEnCurso(efectivo, 2_000, 5_000);

    expect(pago.importeCents).toBe(2_000);
    expect(pago.entregadoCents).toBe(5_000);
    expect(pago.cambioCents).toBe(3_000);
  });

  it('crea un pago no efectivo sin cantidad entregada ni cambio', (): void => {
    const tarjeta: TipoPago = createTipoPago('tipo-pago-tarjeta', 'tarjeta', 'Tarjeta');

    const pago: VentaPagoEnCurso = new VentaPagoEnCurso(tarjeta, 2_500);

    expect(pago.esEfectivo).toBe(false);
    expect(pago.importeCents).toBe(2_500);
    expect(pago.entregadoCents).toBeNull();
    expect(pago.cambioCents).toBe(0);
  });

  it('rechaza una cantidad entregada en un pago no efectivo', (): void => {
    const tarjeta: TipoPago = createTipoPago('tipo-pago-tarjeta', 'tarjeta', 'Tarjeta');

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(tarjeta, 2_500, 3_000)).toThrow(
      'La cantidad entregada solo puede indicarse para un pago en efectivo.',
    );
  });

  it('representa una devolución en efectivo sin entregado ni cambio', (): void => {
    const efectivo: TipoPago = createTipoPago('tipo-pago-efectivo', 'efectivo', 'Efectivo');

    const pago: VentaPagoEnCurso = new VentaPagoEnCurso(efectivo, -2_500);

    expect(pago.esEfectivo).toBe(true);
    expect(pago.importeCents).toBe(-2_500);
    expect(pago.entregadoCents).toBeNull();
    expect(pago.cambioCents).toBe(0);
  });

  it('rechaza una cantidad entregada por el cliente en una devolución en efectivo', (): void => {
    const efectivo: TipoPago = createTipoPago('tipo-pago-efectivo', 'efectivo', 'Efectivo');

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(efectivo, -2_500, 2_500)).toThrow(
      'Una devolución en efectivo no puede tener una cantidad entregada por el cliente.',
    );
  });

  it('rechaza efectivo entregado inferior al importe aplicado', (): void => {
    const efectivo: TipoPago = createTipoPago('tipo-pago-efectivo', 'efectivo', 'Efectivo');

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(efectivo, 5_000, 4_999)).toThrow(
      RangeError,
    );
  });

  it('rechaza un pago de importe cero', (): void => {
    const tarjeta: TipoPago = createTipoPago('tipo-pago-tarjeta', 'tarjeta', 'Tarjeta');

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(tarjeta, 0)).toThrow(RangeError);
  });

  it('rechaza importes que no sean céntimos enteros seguros', (): void => {
    const tarjeta: TipoPago = createTipoPago('tipo-pago-tarjeta', 'tarjeta', 'Tarjeta');

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(tarjeta, 10.5)).toThrow(RangeError);

    expect(
      (): VentaPagoEnCurso => new VentaPagoEnCurso(tarjeta, Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(RangeError);
  });

  it('rechaza tipos de pago que no estén persistidos', (): void => {
    const tarjeta: TipoPago = new TipoPago();

    tarjeta.nombre = 'Tarjeta';
    tarjeta.slug = 'tarjeta';

    expect((): VentaPagoEnCurso => new VentaPagoEnCurso(tarjeta, 1_000)).toThrow(
      'El tipo de pago debe estar persistido.',
    );
  });
});
