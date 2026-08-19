import TipoPago from '@model/tipos-pago/tipo-pago.model';
import VentaFinalizacionEnCurso from '@model/ventas/venta-finalizacion-en-curso.model';
import type VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';

const createTipoPago = (id: number, publicId: string, slug: string, nombre: string): TipoPago => {
  const tipoPago: TipoPago = new TipoPago();

  tipoPago.id = id;
  tipoPago.publicId = publicId;
  tipoPago.slug = slug;
  tipoPago.nombre = nombre;

  return tipoPago;
};

const createEfectivo = (): TipoPago =>
  createTipoPago(1, 'tipo-pago-efectivo', 'efectivo', 'Efectivo');

const createTarjeta = (): TipoPago => createTipoPago(2, 'tipo-pago-tarjeta', 'tarjeta', 'Tarjeta');

const createBizum = (): TipoPago => createTipoPago(3, 'tipo-pago-bizum', 'bizum', 'Bizum');

describe('VentaFinalizacionEnCurso', (): void => {
  it('parte sin pagos y con todo el importe pendiente', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    expect(finalizacion.pagos).toHaveLength(0);
    expect(finalizacion.totalPagadoCents).toBe(0);
    expect(finalizacion.pendienteCents).toBe(6_000);
    expect(finalizacion.completa).toBe(false);
  });

  it('finaliza una venta con un único pago en efectivo', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createEfectivo(), 6_000, 10_000);

    expect(finalizacion.pagos).toHaveLength(1);
    expect(finalizacion.totalPagadoCents).toBe(6_000);
    expect(finalizacion.pendienteCents).toBe(0);
    expect(finalizacion.completa).toBe(true);

    expect(finalizacion.pagos[0].cambioCents).toBe(4_000);
  });

  it('permite finalizar con varios medios de pago', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createEfectivo(), 2_000, 5_000);

    finalizacion.addPago(createTarjeta(), 3_000);

    finalizacion.addPago(createBizum(), 1_000);

    expect(finalizacion.pagos).toHaveLength(3);
    expect(finalizacion.totalPagadoCents).toBe(6_000);
    expect(finalizacion.pendienteCents).toBe(0);
    expect(finalizacion.completa).toBe(true);
  });

  it('mantiene el importe pendiente mientras la finalización sea incompleta', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createTarjeta(), 2_500);

    expect(finalizacion.totalPagadoCents).toBe(2_500);
    expect(finalizacion.pendienteCents).toBe(3_500);
    expect(finalizacion.completa).toBe(false);
  });

  it('impide repetir un mismo tipo de pago', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    const tarjeta: TipoPago = createTarjeta();

    finalizacion.addPago(tarjeta, 2_000);

    expect((): VentaPagoEnCurso => finalizacion.addPago(tarjeta, 1_000)).toThrow(
      'El tipo de pago ya está incluido en la finalización.',
    );

    expect(finalizacion.pagos).toHaveLength(1);
    expect(finalizacion.totalPagadoCents).toBe(2_000);
  });

  it('impide pagar más que el total positivo', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createTarjeta(), 5_000);

    expect((): VentaPagoEnCurso => finalizacion.addPago(createBizum(), 1_001)).toThrow(RangeError);

    expect(finalizacion.totalPagadoCents).toBe(5_000);
    expect(finalizacion.pendienteCents).toBe(1_000);
  });

  it('impide utilizar un pago negativo para una venta positiva', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    expect((): VentaPagoEnCurso => finalizacion.addPago(createTarjeta(), -1_000)).toThrow(
      'El signo del pago no coincide con el total de la venta.',
    );

    expect(finalizacion.pagos).toHaveLength(0);
  });

  it('permite reembolsar una devolución neta mediante varios medios', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(-2_500);

    finalizacion.addPago(createEfectivo(), -1_000);

    finalizacion.addPago(createTarjeta(), -1_500);

    expect(finalizacion.totalPagadoCents).toBe(-2_500);
    expect(finalizacion.pendienteCents).toBe(0);
    expect(finalizacion.completa).toBe(true);

    expect(finalizacion.pagos[0].entregadoCents).toBeNull();
    expect(finalizacion.pagos[0].cambioCents).toBe(0);
  });

  it('mantiene pendiente negativo en una devolución incompleta', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(-2_500);

    finalizacion.addPago(createEfectivo(), -1_000);

    expect(finalizacion.totalPagadoCents).toBe(-1_000);
    expect(finalizacion.pendienteCents).toBe(-1_500);
    expect(finalizacion.completa).toBe(false);
  });

  it('impide reembolsar más que el total de la devolución', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(-2_500);

    finalizacion.addPago(createEfectivo(), -2_000);

    expect((): VentaPagoEnCurso => finalizacion.addPago(createTarjeta(), -501)).toThrow(RangeError);

    expect(finalizacion.totalPagadoCents).toBe(-2_000);
    expect(finalizacion.pendienteCents).toBe(-500);
  });

  it('impide utilizar un pago positivo para una devolución neta', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(-2_500);

    expect((): VentaPagoEnCurso => finalizacion.addPago(createTarjeta(), 1_000)).toThrow(
      'El signo del pago no coincide con el total de la venta.',
    );
  });

  it('considera completa una operación con total cero sin crear pagos ficticios', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(0);

    expect(finalizacion.pagos).toHaveLength(0);
    expect(finalizacion.totalPagadoCents).toBe(0);
    expect(finalizacion.pendienteCents).toBe(0);
    expect(finalizacion.completa).toBe(true);

    expect((): VentaPagoEnCurso => finalizacion.addPago(createEfectivo(), 1)).toThrow(
      'Una venta con total cero no necesita medios de pago.',
    );
  });

  it('permite modificar un pago existente', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    const efectivo: TipoPago = createEfectivo();

    finalizacion.addPago(efectivo, 2_000);

    finalizacion.addPago(createTarjeta(), 3_000);

    const pagoActualizado: VentaPagoEnCurso = finalizacion.updatePago(
      'tipo-pago-efectivo',
      3_000,
      5_000,
    );

    expect(finalizacion.pagos).toHaveLength(2);
    expect(pagoActualizado.importeCents).toBe(3_000);
    expect(pagoActualizado.entregadoCents).toBe(5_000);
    expect(pagoActualizado.cambioCents).toBe(2_000);

    expect(finalizacion.totalPagadoCents).toBe(6_000);
    expect(finalizacion.completa).toBe(true);
  });

  it('no modifica el estado si una actualización supera el total', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createEfectivo(), 2_000);

    finalizacion.addPago(createTarjeta(), 3_000);

    expect((): VentaPagoEnCurso => finalizacion.updatePago('tipo-pago-efectivo', 3_001)).toThrow(
      RangeError,
    );

    expect(finalizacion.totalPagadoCents).toBe(5_000);
    expect(finalizacion.pendienteCents).toBe(1_000);

    expect(finalizacion.pagos[0].importeCents).toBe(2_000);
  });

  it('permite eliminar un pago existente', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    finalizacion.addPago(createEfectivo(), 2_000);

    finalizacion.addPago(createTarjeta(), 4_000);

    expect(finalizacion.completa).toBe(true);

    finalizacion.removePago('tipo-pago-tarjeta');

    expect(finalizacion.pagos).toHaveLength(1);
    expect(finalizacion.totalPagadoCents).toBe(2_000);
    expect(finalizacion.pendienteCents).toBe(4_000);
    expect(finalizacion.completa).toBe(false);
  });

  it('rechaza actualizar un tipo de pago inexistente', (): void => {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(6_000);

    expect((): VentaPagoEnCurso => finalizacion.updatePago('tipo-pago-inexistente', 1_000)).toThrow(
      'El tipo de pago no está incluido en la finalización.',
    );
  });

  it('rechaza un total que no sea un entero seguro de céntimos', (): void => {
    expect((): VentaFinalizacionEnCurso => new VentaFinalizacionEnCurso(10.5)).toThrow(RangeError);

    expect(
      (): VentaFinalizacionEnCurso => new VentaFinalizacionEnCurso(Number.MAX_SAFE_INTEGER + 1),
    ).toThrow(RangeError);
  });
});
