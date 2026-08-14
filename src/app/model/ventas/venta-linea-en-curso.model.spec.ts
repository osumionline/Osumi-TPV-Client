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
    linea.setDescuentoManualBps(1_000);

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

    linea.setDescuentoManualBps(1_000);

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

    linea.setDescuentoManualBps(1_000);
    linea.setImporteManualMicros(7_500_000);

    expect(linea.descuentoBps).toBe(1_000);
    expect(linea.importeFinalMicros).toBe(7_500_000);

    linea.clearImporteManual();

    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('sustituye el descuento porcentual al aplicar un descuento directo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoManualBps(1_000);
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
    expect((): void => linea.setDescuentoManualBps(1_000)).toThrow();
    expect((): void => linea.setDescuentoDirectoMicros(1_000_000)).toThrow();

    expect(linea.importeFinalMicros).toBe(8_000_000);
  });

  it('permite aplicar descuentos normales después de retirar la promoción', (): void => {
    const linea: VentaLineaEnCurso = createLinea(1_000, 800);

    linea.clearDescuentoPromocional();
    linea.setDescuentoManualBps(1_000);

    expect(linea.tieneDescuentoPromocional).toBe(false);
    expect(linea.importeDescuentoMicros).toBe(1_000_000);
    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('aplica el descuento del cliente cuando no existe un porcentaje manual', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoClienteBps(1_000);

    expect(linea.descuentoClienteBps).toBe(1_000);
    expect(linea.descuentoManualBps).toBeNull();
    expect(linea.descuentoBps).toBe(1_000);
    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('permite que un descuento manual oculte temporalmente el descuento del cliente', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoClienteBps(1_000);
    linea.setDescuentoManualBps(2_500);

    expect(linea.descuentoClienteBps).toBe(1_000);
    expect(linea.descuentoManualBps).toBe(2_500);
    expect(linea.descuentoBps).toBe(2_500);
    expect(linea.importeFinalMicros).toBe(7_500_000);

    linea.clearDescuentoManual();

    expect(linea.descuentoManualBps).toBeNull();
    expect(linea.descuentoBps).toBe(1_000);
    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('recupera el descuento del cliente al retirar un descuento directo', (): void => {
    const linea: VentaLineaEnCurso = createLinea();

    linea.setDescuentoClienteBps(1_000);
    linea.setDescuentoManualBps(2_500);
    linea.setDescuentoDirectoMicros(2_000_000);

    expect(linea.descuentoManualBps).toBeNull();
    expect(linea.descuentoClienteBps).toBe(1_000);
    expect(linea.importeFinalMicros).toBe(8_000_000);

    linea.clearDescuentoDirecto();

    expect(linea.descuentoBps).toBe(1_000);
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

  it('crea una línea Varios con sus datos específicos', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Servicio especial',
      pvpMicros: 12_500_000,
      ivaBps: 2_100,
    });

    expect(linea.esVarios).toBe(true);
    expect(linea.idArticulo).toBeNull();
    expect(linea.articuloPublicId).toBeNull();
    expect(linea.localizador).toBe(0);
    expect(linea.descripcion).toBe('Servicio especial');
    expect(linea.marca).toBe('Varios');
    expect(linea.stock).toBeNull();
    expect(linea.cantidad).toBe(1);
    expect(linea.pucMicros).toBe(0);
    expect(linea.pvpMicros).toBe(12_500_000);
    expect(linea.ivaBps).toBe(2_100);
    expect(linea.importeFinalMicros).toBe(12_500_000);
  });

  it('permite crear un Varios con PVP cero', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Varios',
      pvpMicros: 0,
      ivaBps: 2_100,
    });

    expect(linea.pvpMicros).toBe(0);
    expect(linea.importeFinalMicros).toBe(0);
  });

  it('valida los datos propios de una línea Varios', (): void => {
    expect((): VentaLineaEnCurso =>
      new VentaLineaEnCurso().fromVarios({
        descripcion: '   ',
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
      }),
    ).toThrow(RangeError);

    expect((): VentaLineaEnCurso =>
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: -1,
        ivaBps: 2_100,
      }),
    ).toThrow(RangeError);

    expect((): VentaLineaEnCurso =>
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 1_000_000,
        ivaBps: 10_001,
      }),
    ).toThrow(RangeError);
  });

  it('edita un Varios sin destruir cantidad, regalo ni descuentos', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Varios',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    linea.setCantidad(2);
    linea.setDescuentoClienteBps(1_000);
    linea.setDescuentoManualBps(2_000);
    linea.setRegalo(true);

    linea.setDatosVarios({
      descripcion: 'Servicio modificado',
      pvpMicros: 15_000_000,
      ivaBps: 1_000,
    });

    expect(linea.descripcion).toBe('Servicio modificado');
    expect(linea.pvpMicros).toBe(15_000_000);
    expect(linea.ivaBps).toBe(1_000);

    expect(linea.cantidad).toBe(2);
    expect(linea.descuentoClienteBps).toBe(1_000);
    expect(linea.descuentoManualBps).toBe(2_000);
    expect(linea.regalo).toBe(true);
  });

  it('impide reducir el PVP de un Varios por debajo de su descuento directo', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Varios',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    linea.setDescuentoDirectoMicros(5_000_000);

    expect((): void =>
      linea.setDatosVarios({
        descripcion: 'Varios modificado',
        pvpMicros: 4_000_000,
        ivaBps: 2_100,
      }),
    ).toThrow(RangeError);

    expect(linea.descripcion).toBe('Varios');
    expect(linea.pvpMicros).toBe(10_000_000);
  });

  it('crea una devolución con cantidad e importe negativos', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromDevolucion(
      {
        id: 100,
        publicId: 'linea-original',
        idArticulo: 10,
        articuloPublicId: 'articulo-10',
        localizador: 25,
        nombre: 'Artículo devuelto',
        pucMicros: 5_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 18_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 2_000_000,
        unidades: 2,
        unidadesDevueltas: 0,
        unidadesDisponibles: 2,
        regalo: false,
      },
      1,
    );

    expect(linea.esDevolucion).toBe(true);
    expect(linea.esVarios).toBe(false);

    expect(linea.cantidad).toBe(-1);
    expect(linea.unidadesDevolucion).toBe(1);

    expect(linea.importeDevolucionMicros).toBe(9_000_000);

    expect(linea.importeFinalMicros).toBe(-9_000_000);
  });

  it('reparte el importe histórico de forma acumulativa entre devoluciones parciales', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromDevolucion(
      {
        id: 100,
        publicId: 'linea-original',
        idArticulo: 10,
        articuloPublicId: 'articulo-10',
        localizador: 25,
        nombre: 'Artículo',
        pucMicros: 0,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,

        importeMicros: 25_000_000,

        descuentoBps: 0,
        importeDescuentoMicros: 5_000_000,

        unidades: 3,
        unidadesDevueltas: 1,
        unidadesDisponibles: 2,

        regalo: false,
      },
      1,
    );

    expect(linea.importeDevolucionMicros).toBe(8_333_334);
  });

  it('impide modificar económicamente una línea de devolución', (): void => {
    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromDevolucion(
      {
        id: 100,
        publicId: 'linea-original',
        idArticulo: 10,
        articuloPublicId: 'articulo-10',
        localizador: 25,
        nombre: 'Artículo',
        pucMicros: 0,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 10_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        unidadesDevueltas: 0,
        unidadesDisponibles: 1,
        regalo: false,
      },
      1,
    );

    expect((): void => linea.setCantidad(2)).toThrow();

    expect((): void => linea.setRegalo(true)).toThrow();

    expect((): void => linea.setDescuentoManualBps(1_000)).toThrow();

    expect((): void => linea.setImporteManualMicros(5_000_000)).toThrow();
  });
});
