import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import Cliente from '@model/clientes/cliente.model';
import mapVentaToCrearReservaCommand from '@model/reservas/crear-reserva-command.mapper';
import VentaEnCurso from '@model/ventas/venta-en-curso.model';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';

const createCliente = (): Cliente => {
  const cliente: Cliente = new Cliente();

  cliente.id = 1;
  cliente.publicId = 'cliente-1';

  cliente.nombreApellidos = 'Cliente';

  cliente.descuento = 10;

  return cliente;
};

describe('mapVentaToCrearReservaCommand', (): void => {
  it('crea el snapshot de una venta con descuento porcentual', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.setCliente(createCliente());

    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Servicio',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    linea.setCantidad(2);

    venta.addLinea(linea);

    const command: CrearReservaCommand = mapVentaToCrearReservaCommand(venta);

    expect(command.clientePublicId).toBe('cliente-1');

    expect(command.lineas).toHaveLength(1);

    expect(command.lineas[0]?.descuentoBps).toBe(1_000);

    expect(command.lineas[0]?.importeDescuentoMicros).toBe(0);

    expect(command.lineas[0]?.importeMicros).toBe(18_000_000);

    expect(command.lineas[0]?.unidades).toBe(2);
  });

  it('conserva un descuento directo como importe histórico', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.setCliente(createCliente());

    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Servicio',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    venta.addLinea(linea);

    linea.setDescuentoDirectoMicros(2_000_000);

    const command: CrearReservaCommand = mapVentaToCrearReservaCommand(venta);

    expect(command.lineas[0]?.descuentoBps).toBe(0);

    expect(command.lineas[0]?.importeDescuentoMicros).toBe(2_000_000);

    expect(command.lineas[0]?.importeMicros).toBe(8_000_000);
  });

  it('representa un regalo mediante su descuento económico completo', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.setCliente(createCliente());

    const linea: VentaLineaEnCurso = new VentaLineaEnCurso().fromVarios({
      descripcion: 'Regalo',
      pvpMicros: 15_000_000,
      ivaBps: 2_100,
    });

    venta.addLinea(linea);

    linea.setRegalo(true);

    const command: CrearReservaCommand = mapVentaToCrearReservaCommand(venta);

    expect(command.lineas[0]?.importeMicros).toBe(0);

    expect(command.lineas[0]?.descuentoBps).toBe(0);

    expect(command.lineas[0]?.importeDescuentoMicros).toBe(15_000_000);
  });

  it('exige un cliente', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.addLinea(
      new VentaLineaEnCurso().fromVarios({
        descripcion: 'Varios',
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
      }),
    );

    expect((): CrearReservaCommand => mapVentaToCrearReservaCommand(venta)).toThrow(
      'Para crear una reserva es obligatorio seleccionar un cliente.',
    );
  });

  it('impide crear otra reserva desde una venta procedente de reservas', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    venta.setCliente(createCliente());

    venta.reservasOrigen = [
      {
        id: 1,
        publicId: 'reserva-1',
        idCliente: 1,
        clientePublicId: 'cliente-1',
        lineas: [],
      },
    ];

    expect((): CrearReservaCommand => mapVentaToCrearReservaCommand(venta)).toThrow(
      'No se puede crear una nueva reserva desde una venta que ya procede de reservas.',
    );
  });
});
