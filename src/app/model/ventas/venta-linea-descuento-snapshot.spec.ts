import {
  getVentaLineaDescuentoSnapshot,
  type VentaLineaDescuentoSnapshot,
} from '@model/ventas/venta-linea-descuento-snapshot';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';

function createLinea(pvpMicros: number = 10_000_000): VentaLineaEnCurso {
  return new VentaLineaEnCurso().fromVarios({
    descripcion: 'Línea de prueba',
    pvpMicros,
    ivaBps: 2_100,
  });
}

describe('getVentaLineaDescuentoSnapshot', (): void => {
  it('conserva un descuento porcentual como puntos básicos', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoClienteBps(1_000);

    const snapshot: VentaLineaDescuentoSnapshot = getVentaLineaDescuentoSnapshot(linea);

    expect(snapshot).toEqual({
      descuentoBps: 1_000,
      importeDescuentoMicros: 0,
    });
  });

  it('prioriza el descuento porcentual manual sobre el descuento del cliente', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoClienteBps(1_000);
    linea.setDescuentoManualBps(2_500);

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 2_500,
      importeDescuentoMicros: 0,
    });
  });

  it('representa un descuento directo mediante un importe fijo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoDirectoMicros(2_000_000);

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 0,
      importeDescuentoMicros: 2_000_000,
    });
  });

  it('representa un precio promocional mediante su descuento económico', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.pvpDescuentoMicros = 8_000_000;

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 0,
      importeDescuentoMicros: 2_000_000,
    });
  });

  it('representa un importe manual mediante la diferencia respecto al importe base', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setCantidad(2);
    linea.setImporteManualMicros(15_000_000);

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 0,
      importeDescuentoMicros: 5_000_000,
    });
  });

  it('no genera un descuento negativo si el importe manual supera al importe base', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setImporteManualMicros(12_000_000);

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 0,
      importeDescuentoMicros: 0,
    });
  });

  it('representa un regalo mediante el descuento completo del importe base', (): void => {
    const linea: VentaLineaEnCurso = createLinea(15_000_000);

    linea.setCantidad(2);
    linea.setRegalo(true);

    expect(getVentaLineaDescuentoSnapshot(linea)).toEqual({
      descuentoBps: 0,
      importeDescuentoMicros: 30_000_000,
    });
  });
});
