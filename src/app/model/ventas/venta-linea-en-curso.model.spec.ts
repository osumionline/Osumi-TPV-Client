import ArticuloVenta from '@model/ventas/articulo-venta.model';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';

const createLinea = (
  pvpCents: number = 1_000,
  pvpDescuentoCents: number | null = null,
): VentaLineaEnCurso => {
  const articulo: ArticuloVenta = new ArticuloVenta();

  articulo.id = 1;
  articulo.publicId = 'articulo-1';
  articulo.localizador = 1;
  articulo.nombre = 'Artículo de prueba';
  articulo.marca = 'Marca';
  articulo.pucMicros = 5_000_000;
  articulo.pvpCents = pvpCents;
  articulo.pvpDescuentoCents = pvpDescuentoCents;
  articulo.ivaBps = 2_100;
  articulo.stock = 10;

  return new VentaLineaEnCurso().fromArticulo(articulo);
};

describe('VentaLineaEnCurso', (): void => {
  it('calcula el importe base a partir del PVP y la cantidad', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setCantidad(3);

    expect(linea.importeBaseMicros).toBe(30_000_000);
    expect(linea.importeFinalMicros).toBe(30_000_000);
  });

  it('aplica un descuento porcentual sobre todas las unidades', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setCantidad(2);
    linea.setDescuentoBps(1_000);

    expect(linea.importeBaseMicros).toBe(20_000_000);
    expect(linea.importeDescuentoMicros).toBe(2_000_000);
    expect(linea.importeFinalMicros).toBe(18_000_000);
  });

  it('escala el descuento promocional con la cantidad', (): void => {
    const linea: VentaLineaEnCurso = createLinea(1_000, 800);

    linea.setCantidad(3);

    expect(linea.tieneDescuentoPromocional).toBe(true);
    expect(linea.importeDescuentoPromocionalMicros).toBe(6_000_000);
    expect(linea.importeFinalMicros).toBe(24_000_000);
  });

  it('conserva el descuento existente mientras la línea está marcada como regalo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoBps(1_000);

    expect(linea.importeFinalMicros).toBe(9_000_000);

    linea.setRegalo(true);

    expect(linea.importeFinalMicros).toBe(0);
    expect(linea.descuentoBps).toBe(1_000);

    linea.setRegalo(false);

    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('conserva el importe manual mientras la línea está marcada como regalo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setImporteManualMicros(7_500_000);

    linea.setRegalo(true);

    expect(linea.importeFinalMicros).toBe(0);
    expect(linea.importeManualMicros).toBe(7_500_000);

    linea.setRegalo(false);

    expect(linea.importeFinalMicros).toBe(7_500_000);
  });

  it('permite que un importe manual oculte temporalmente un descuento porcentual', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoBps(1_000);
    linea.setImporteManualMicros(7_500_000);

    expect(linea.descuentoBps).toBe(1_000);
    expect(linea.importeFinalMicros).toBe(7_500_000);

    linea.clearImporteManual();

    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('sustituye el descuento porcentual al aplicar un descuento directo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoBps(1_000);
    linea.setDescuentoDirectoMicros(2_000_000);

    expect(linea.descuentoBps).toBe(0);
    expect(linea.descuentoDirectoMicros).toBe(2_000_000);
    expect(linea.importeFinalMicros).toBe(8_000_000);

    linea.clearDescuentoDirecto();

    expect(linea.importeFinalMicros).toBe(10_000_000);
  });

  it('rechaza cantidades que no sean enteros positivos', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    expect((): void => linea.setCantidad(0)).toThrow(RangeError);
    expect((): void => linea.setCantidad(-1)).toThrow(RangeError);
    expect((): void => linea.setCantidad(1.5)).toThrow(RangeError);

    expect(linea.cantidad).toBe(1);
  });

  it('rechaza un descuento directo superior al importe base', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    expect((): void => linea.setDescuentoDirectoMicros(11_000_000)).toThrow(RangeError);

    expect(linea.descuentoDirectoMicros).toBeNull();
    expect(linea.importeFinalMicros).toBe(10_000_000);
  });

  it('impide reducir la cantidad si el descuento directo quedaría por encima del importe base', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setCantidad(2);
    linea.setDescuentoDirectoMicros(15_000_000);

    expect((): void => linea.setCantidad(1)).toThrow(RangeError);

    expect(linea.cantidad).toBe(2);
    expect(linea.importeFinalMicros).toBe(5_000_000);
  });

  it('impide aplicar otras modificaciones económicas mientras exista una promoción', (): void => {
    const linea: VentaLineaEnCurso = createLinea(1_000, 800);

    expect((): void => linea.setImporteManualMicros(7_000_000)).toThrow();
    expect((): void => linea.setDescuentoBps(1_000)).toThrow();
    expect((): void => linea.setDescuentoDirectoMicros(1_000_000)).toThrow();

    expect(linea.importeFinalMicros).toBe(8_000_000);
  });

  it('permite aplicar descuentos normales después de retirar la promoción', (): void => {
    const linea: VentaLineaEnCurso = createLinea(1_000, 800);

    linea.clearDescuentoPromocional();
    linea.setDescuentoBps(1_000);

    expect(linea.tieneDescuentoPromocional).toBe(false);
    expect(linea.importeDescuentoMicros).toBe(1_000_000);
    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('impide combinar un importe manual con un descuento directo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setImporteManualMicros(7_000_000);

    expect((): void => linea.setDescuentoDirectoMicros(1_000_000)).toThrow();

    linea.clearImporteManual();
    linea.setDescuentoDirectoMicros(1_000_000);

    expect((): void => linea.setImporteManualMicros(7_000_000)).toThrow();
  });
});
