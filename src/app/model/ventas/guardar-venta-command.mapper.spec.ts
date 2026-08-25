import type {
  default as ReservaInterface,
  ReservaLineaInterface,
} from '@desktop-contracts/reservas/reserva.interface';
import type {
  GuardarVentaCommand,
  GuardarVentaLineaCommand,
} from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type { VentaDevolucionLineaInterface } from '@desktop-contracts/ventas/venta-devolucion.interface';
import Cliente from '@model/clientes/cliente.model';
import Empleado from '@model/empleados/empleado.model';
import ArticuloVenta from '@model/ventas/articulo-venta.model';
import mapVentaToGuardarVentaCommand from '@model/ventas/guardar-venta-command.mapper';
import type VentaDevolucionOrigen from '@model/ventas/venta-devolucion-origen.interface';
import VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type {
  VentaFinalizacionResultado,
  VentaPagoFinalizado,
} from '@model/ventas/venta-finalizacion-resultado.interface';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type VentaLineaReservaOrigen from '@model/ventas/venta-linea-reserva-origen.interface';
import type VentaReservaOrigen from '@model/ventas/venta-reserva-origen.interface';

interface ReservaFixture {
  readonly reserva: ReservaInterface;
  readonly origen: VentaReservaOrigen;
  readonly lineaA: ReservaLineaInterface;
  readonly lineaB: ReservaLineaInterface;
}

function createEmpleado(): Empleado {
  const empleado: Empleado = new Empleado();

  empleado.id = 1;
  empleado.publicId = 'empleado-1';
  empleado.nombre = 'Empleado';

  return empleado;
}

function createCliente(): Cliente {
  const cliente: Cliente = new Cliente();

  cliente.id = 1;
  cliente.publicId = 'cliente-1';
  cliente.nombreApellidos = 'Cliente';
  cliente.descuento = 0;

  return cliente;
}

function createArticulo(): ArticuloVenta {
  const articulo: ArticuloVenta = new ArticuloVenta();

  articulo.id = 10;
  articulo.publicId = 'articulo-10';
  articulo.localizador = 25;
  articulo.nombre = 'Artículo normal';
  articulo.marca = 'Marca';
  articulo.pucMicros = 4_000_000;
  articulo.pvpCents = 1_000;
  articulo.pvpDescuentoCents = null;
  articulo.ivaBps = 2_100;
  articulo.stock = 20;

  return articulo;
}

function createVenta(): VentaEnCurso {
  const venta: VentaEnCurso = new VentaEnCurso(1);

  venta.setEmpleado(createEmpleado());

  return venta;
}

function createFinalizacion(
  totalCents: number,
  pagos: readonly VentaPagoFinalizado[],
): VentaFinalizacionResultado {
  return {
    totalCents,
    pagos,
  };
}

function createReservaFixture(): ReservaFixture {
  const lineaA: ReservaLineaInterface = {
    id: 20,
    publicId: 'linea-reserva-20',
    idArticulo: 10,
    articuloPublicId: 'articulo-10',
    localizador: 25,
    marca: 'Marca',
    nombre: 'Artículo reservado A',
    pucMicros: 5_000_000,
    pvpMicros: 10_000_000,
    ivaBps: 2_100,
    importeMicros: 18_000_000,
    descuentoBps: 1_000,
    importeDescuentoMicros: 2_000_000,
    unidades: 2,
  };

  const lineaB: ReservaLineaInterface = {
    id: 21,
    publicId: 'linea-reserva-21',
    idArticulo: 11,
    articuloPublicId: 'articulo-11',
    localizador: 26,
    marca: 'Marca',
    nombre: 'Artículo reservado B',
    pucMicros: 6_000_000,
    pvpMicros: 12_000_000,
    ivaBps: 2_100,
    importeMicros: 12_000_000,
    descuentoBps: 0,
    importeDescuentoMicros: 0,
    unidades: 1,
  };

  const reserva: ReservaInterface = {
    id: 10,
    publicId: 'reserva-10',
    idCliente: 1,
    clientePublicId: 'cliente-1',
    clienteNombre: 'Cliente',
    totalMicros: 30_000_000,
    fecha: '2026-08-20',
    lineas: [lineaA, lineaB],
  };

  const lineasOrigen: readonly VentaLineaReservaOrigen[] = reserva.lineas.map(
    (linea: ReservaLineaInterface): VentaLineaReservaOrigen => ({
      reservaId: reserva.id,
      reservaPublicId: reserva.publicId,
      lineaId: linea.id,
      lineaPublicId: linea.publicId,
      idArticulo: linea.idArticulo,
      articuloPublicId: linea.articuloPublicId,
      unidadesReservadas: linea.unidades,
      importeReservadoMicros: linea.importeMicros,
      descuentoBps: linea.descuentoBps,
      importeDescuentoReservadoMicros: linea.importeDescuentoMicros,
    }),
  );

  const origen: VentaReservaOrigen = {
    id: reserva.id,
    publicId: reserva.publicId,
    idCliente: reserva.idCliente,
    clientePublicId: reserva.clientePublicId,
    lineas: lineasOrigen,
  };

  return {
    reserva,
    origen,
    lineaA,
    lineaB,
  };
}

describe('mapVentaToGuardarVentaCommand', (): void => {
  it('mapea una venta ordinaria con artículo, Varios y pagos múltiples', (): void => {
    const venta: VentaEnCurso = createVenta();

    venta.setCliente(createCliente());

    const articuloLinea: VentaLineaEnCurso = new VentaLineaEnCurso().fromArticulo(createArticulo());

    articuloLinea.setCantidad(2);

    articuloLinea.setDescuentoManualBps(1_000);

    venta.addLinea(articuloLinea);

    const variosLinea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Servicio especial',
      pvpMicros: 5_000_000,
      ivaBps: 2_100,
    });

    variosLinea.setDescuentoDirectoMicros(1_000_000);

    venta.addLinea(variosLinea);

    const finalizacion: VentaFinalizacionResultado = createFinalizacion(venta.totalCents, [
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: 1_200,
        entregadoCents: 2_000,
        cambioCents: 800,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      finalizacion,
      '  caja-1  ',
    );

    expect(command.publicId).toBe(venta.idTemporal);

    expect(command.cajaPublicId).toBe('caja-1');

    expect(command.empleadoPublicId).toBe('empleado-1');

    expect(command.clientePublicId).toBe('cliente-1');

    expect(command.devolucionVentaOrigenPublicId).toBeNull();

    expect(command.reservasOrigenPublicIds).toEqual([]);

    expect(command.totalCents).toBe(2_200);

    expect(command.lineas).toEqual([
      {
        articuloPublicId: 'articulo-10',
        nombre: 'Artículo normal',
        localizador: 25,
        marca: 'Marca',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 18_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        unidades: 2,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
      {
        articuloPublicId: null,
        localizador: 0,
        marca: 'Varios',
        nombre: 'Servicio especial',
        pucMicros: 0,
        pvpMicros: 5_000_000,
        ivaBps: 2_100,
        importeMicros: 4_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 1_000_000,
        unidades: 1,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ]);

    expect(command.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: 1_200,
        entregadoCents: 2_000,
        cambioCents: 800,
      },
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);
  });

  it('mapea una operación de total cero sin pagos', (): void => {
    const venta: VentaEnCurso = createVenta();

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Operación sin importe',
        pvpMicros: 0,
        ivaBps: 2_100,
      }),
    );

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      createFinalizacion(0, []),
      'caja-1',
    );

    expect(command.totalCents).toBe(0);

    expect(command.pagos).toEqual([]);

    expect(command.clientePublicId).toBeNull();
  });

  it('conserva la economía histórica proporcional de una línea procedente de reserva', (): void => {
    const fixture: ReservaFixture = createReservaFixture();

    const venta: VentaEnCurso = createVenta();

    const lineaReservaA: VentaLineaEnCurso = new VentaLineaEnCurso().fromReserva(
      fixture.reserva,
      fixture.lineaA,
    );

    const lineaReservaB: VentaLineaEnCurso = new VentaLineaEnCurso().fromReserva(
      fixture.reserva,
      fixture.lineaB,
    );

    venta.setReservas(createCliente(), [fixture.origen], [lineaReservaA, lineaReservaB]);

    lineaReservaA.setCantidadReserva(3);

    const finalizacion: VentaFinalizacionResultado = createFinalizacion(venta.totalCents, [
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: venta.totalCents,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      finalizacion,
      'caja-1',
    );

    expect(command.reservasOrigenPublicIds).toEqual(['reserva-10']);

    expect(command.lineas[0]).toEqual({
      articuloPublicId: 'articulo-10',
      localizador: 25,
      marca: 'Marca',
      nombre: 'Artículo reservado A',
      pucMicros: 5_000_000,
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
      importeMicros: 27_000_000,
      descuentoBps: 1_000,
      importeDescuentoMicros: 3_000_000,
      unidades: 3,
      regalo: false,
      devolucionLineaOrigenPublicId: null,
      reservaLineaOrigenPublicId: 'linea-reserva-20',
    });
  });

  it('conserva la reserva origen aunque una de sus líneas haya sido eliminada de la venta', (): void => {
    const fixture: ReservaFixture = createReservaFixture();

    const venta: VentaEnCurso = createVenta();

    const lineaReservaA: VentaLineaEnCurso = new VentaLineaEnCurso().fromReserva(
      fixture.reserva,
      fixture.lineaA,
    );

    const lineaReservaB: VentaLineaEnCurso = new VentaLineaEnCurso().fromReserva(
      fixture.reserva,
      fixture.lineaB,
    );

    venta.setReservas(createCliente(), [fixture.origen], [lineaReservaA, lineaReservaB]);

    venta.removeLinea(lineaReservaB.idTemporal);

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      createFinalizacion(venta.totalCents, [
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          importeCents: venta.totalCents,
          entregadoCents: null,
          cambioCents: 0,
        },
      ]),
      'caja-1',
    );

    expect(command.lineas).toHaveLength(1);

    expect(command.lineas[0]?.reservaLineaOrigenPublicId).toBe('linea-reserva-20');

    expect(command.reservasOrigenPublicIds).toEqual(['reserva-10']);
  });

  it('mapea una devolución parcial sucesiva conservando el origen exacto y el descuento proporcional acumulativo', (): void => {
    const venta: VentaEnCurso = createVenta();

    const lineaOriginal: VentaDevolucionLineaInterface = {
      id: 100,
      publicId: 'linea-venta-original-100',
      idArticulo: 10,
      articuloPublicId: 'articulo-10',
      localizador: 25,
      nombre: 'Artículo devuelto',
      pucMicros: 4_000_000,
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
      importeMicros: 25_000_000,
      descuentoBps: 0,
      importeDescuentoMicros: 5_000_000,
      unidades: 3,
      unidadesDevueltas: 1,
      unidadesDisponibles: 2,
      regalo: false,
    };

    const lineaDevolucion: VentaLineaEnCurso = new VentaLineaEnCurso().fromDevolucion(
      lineaOriginal,
      1,
    );

    const origen: VentaDevolucionOrigen = {
      id: 50,
      publicId: 'venta-origen-50',
      serie: '',
      numero: 50,
    };

    venta.setDevolucion(origen, [lineaDevolucion]);

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      createFinalizacion(venta.totalCents, [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          importeCents: venta.totalCents,
          entregadoCents: null,
          cambioCents: 0,
        },
      ]),
      'caja-1',
    );

    expect(venta.totalCents).toBe(-833);

    expect(command.devolucionVentaOrigenPublicId).toBe('venta-origen-50');

    expect(command.lineas).toHaveLength(1);

    const linea: GuardarVentaLineaCommand | undefined = command.lineas[0];

    expect(linea).toEqual({
      articuloPublicId: 'articulo-10',
      localizador: 25,
      marca: 'Sin marca',
      nombre: 'Artículo devuelto',
      pucMicros: 4_000_000,
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
      importeMicros: -8_333_334,
      descuentoBps: 0,
      importeDescuentoMicros: 1_666_666,
      unidades: -1,
      regalo: false,
      devolucionLineaOrigenPublicId: 'linea-venta-original-100',
      reservaLineaOrigenPublicId: null,
    });

    expect(command.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: -833,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);
  });

  it('rechaza una caja vacía', (): void => {
    const venta: VentaEnCurso = createVenta();

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
      }),
    );

    expect((): GuardarVentaCommand =>
      mapVentaToGuardarVentaCommand(venta, createFinalizacion(venta.totalCents, []), '   '),
    ).toThrow('No se puede guardar una venta sin una caja abierta válida.');
  });

  it('rechaza una venta sin empleado persistido', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
      }),
    );

    expect((): GuardarVentaCommand =>
      mapVentaToGuardarVentaCommand(venta, createFinalizacion(venta.totalCents, []), 'caja-1'),
    ).toThrow('No se puede guardar una venta sin un empleado persistido.');
  });

  it('rechaza un cliente no persistido', (): void => {
    const venta: VentaEnCurso = createVenta();

    const cliente: Cliente = new Cliente();

    cliente.nombreApellidos = 'Cliente temporal';

    venta.setCliente(cliente);

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
      }),
    );

    expect((): GuardarVentaCommand =>
      mapVentaToGuardarVentaCommand(venta, createFinalizacion(venta.totalCents, []), 'caja-1'),
    ).toThrow('No se puede guardar una venta con un cliente no persistido.');
  });

  it('rechaza una venta sin líneas', (): void => {
    const venta: VentaEnCurso = createVenta();

    expect((): GuardarVentaCommand =>
      mapVentaToGuardarVentaCommand(venta, createFinalizacion(0, []), 'caja-1'),
    ).toThrow('No se puede guardar una venta sin líneas.');
  });

  it('rechaza una finalización cuyo total ha quedado obsoleto respecto a la venta', (): void => {
    const venta: VentaEnCurso = createVenta();

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
      }),
    );

    const finalizacion: VentaFinalizacionResultado = createFinalizacion(1_000, [
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);

    venta.lineas[0]?.setCantidad(2);

    expect((): GuardarVentaCommand =>
      mapVentaToGuardarVentaCommand(venta, finalizacion, 'caja-1'),
    ).toThrow('El total de la finalización no coincide con el total actual de la venta.');
  });
});
