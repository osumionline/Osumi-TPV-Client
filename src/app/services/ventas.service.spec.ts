import Cliente from '@model/clientes/cliente.model';
import ArticuloVenta from '@model/ventas/articulo-venta.model';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type { VentaWorkspaceState } from '@model/ventas/venta-workspace.interface';
import VentasService from '@services/ventas.service';

const createArticulo = (publicId: string, pvpCents: number = 1_000): ArticuloVenta => {
  const articulo: ArticuloVenta = new ArticuloVenta();

  articulo.id = Number(publicId.replace(/\D/g, '')) || 1;
  articulo.publicId = publicId;
  articulo.localizador = articulo.id;
  articulo.nombre = `Artículo ${publicId}`;
  articulo.marca = 'Marca';
  articulo.pucMicros = 5_000_000;
  articulo.pvpCents = pvpCents;
  articulo.pvpDescuentoCents = null;
  articulo.ivaBps = 2_100;
  articulo.stock = 10;

  return articulo;
};

const createCliente = (publicId: string, descuento: number): Cliente => {
  const cliente: Cliente = new Cliente();

  cliente.id = Number(publicId.replace(/\D/g, '')) || 1;
  cliente.publicId = publicId;
  cliente.nombreApellidos = `Cliente ${publicId}`;
  cliente.descuento = descuento;

  return cliente;
};

describe('VentasService', (): void => {
  it('incrementa la cantidad cuando se añade de nuevo el mismo artículo', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();
    const articulo: ArticuloVenta = createArticulo('articulo-1');

    service.agregarArticulos(venta.idTemporal, [articulo]);
    service.agregarArticulos(venta.idTemporal, [articulo]);

    expect(venta.lineas).toHaveLength(1);
    expect(venta.lineas[0]?.cantidad).toBe(2);
    expect(venta.totalCents).toBe(2_000);
  });

  it('actualiza el total de la venta al operar sobre sus líneas', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [
      createArticulo('articulo-1', 1_000),
      createArticulo('articulo-2', 2_000),
    ]);

    const primeraLinea: VentaLineaEnCurso = venta.lineas[0]!;
    const segundaLinea: VentaLineaEnCurso = venta.lineas[1]!;

    expect(service.ventaActiva()?.totalCents).toBe(3_000);

    service.cambiarCantidad(venta.idTemporal, primeraLinea.idTemporal, 3);

    expect(service.ventaActiva()?.totalCents).toBe(5_000);

    service.establecerDescuentoPorcentaje(venta.idTemporal, primeraLinea.idTemporal, 1_000);

    expect(service.ventaActiva()?.totalCents).toBe(4_700);

    service.alternarRegalo(venta.idTemporal, segundaLinea.idTemporal);

    expect(service.ventaActiva()?.totalCents).toBe(2_700);

    service.alternarRegalo(venta.idTemporal, segundaLinea.idTemporal);

    expect(service.ventaActiva()?.totalCents).toBe(4_700);
  });

  it('redondea el total después de sumar los importes de las líneas en microeuros', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [
      createArticulo('articulo-1', 1),
      createArticulo('articulo-2', 1),
    ]);

    const primeraLinea: VentaLineaEnCurso = venta.lineas[0]!;
    const segundaLinea: VentaLineaEnCurso = venta.lineas[1]!;

    service.establecerDescuentoPorcentaje(venta.idTemporal, primeraLinea.idTemporal, 5_000);
    service.establecerDescuentoPorcentaje(venta.idTemporal, segundaLinea.idTemporal, 5_000);

    expect(primeraLinea.importeFinalMicros).toBe(5_000);
    expect(segundaLinea.importeFinalMicros).toBe(5_000);

    expect(venta.totalMicros).toBe(10_000);
    expect(venta.totalCents).toBe(1);
  });

  it('devuelve el foco al localizador al eliminar la línea que estaba siendo editada', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1')]);

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    service.setFocusTarget(venta.idTemporal, {
      type: 'linea',
      lineaIdTemporal: linea.idTemporal,
      field: 'cantidad',
    });

    service.eliminarLinea(venta.idTemporal, linea.idTemporal);

    const workspace: VentaWorkspaceState | null = service.getWorkspace(venta.idTemporal);

    expect(venta.lineas).toHaveLength(0);
    expect(workspace?.focusTarget).toEqual({
      type: 'localizador',
    });
  });

  it('conserva el foco si se elimina una línea distinta de la que estaba siendo editada', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [
      createArticulo('articulo-1'),
      createArticulo('articulo-2'),
    ]);

    const primeraLinea: VentaLineaEnCurso = venta.lineas[0]!;
    const segundaLinea: VentaLineaEnCurso = venta.lineas[1]!;

    service.setFocusTarget(venta.idTemporal, {
      type: 'linea',
      lineaIdTemporal: primeraLinea.idTemporal,
      field: 'descuento-porcentaje',
    });

    service.eliminarLinea(venta.idTemporal, segundaLinea.idTemporal);

    const workspace: VentaWorkspaceState | null = service.getWorkspace(venta.idTemporal);

    expect(venta.lineas).toHaveLength(1);
    expect(workspace?.focusTarget).toEqual({
      type: 'linea',
      lineaIdTemporal: primeraLinea.idTemporal,
      field: 'descuento-porcentaje',
    });
  });

  it('mantiene por separado el estado del panel de estadísticas de cada venta', (): void => {
    const service: VentasService = new VentasService();

    const primeraVenta: VentaEnCurso = service.crearVenta();

    const segundaVenta: VentaEnCurso = service.crearVenta();

    service.setClienteEstadisticasExpanded(primeraVenta.idTemporal, false);

    expect(service.getWorkspace(primeraVenta.idTemporal)?.clienteEstadisticasExpanded).toBe(false);

    expect(service.getWorkspace(segundaVenta.idTemporal)?.clienteEstadisticasExpanded).toBe(true);
  });

  it('aplica el descuento del cliente a las líneas existentes y a las nuevas', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1', 1_000)]);

    const cliente: Cliente = createCliente('cliente-1', 10);

    service.asignarCliente(venta.idTemporal, cliente);

    const primeraLinea: VentaLineaEnCurso = venta.lineas[0]!;

    expect(venta.cliente).toBe(cliente);
    expect(primeraLinea.descuentoClienteBps).toBe(1_000);
    expect(primeraLinea.importeFinalMicros).toBe(9_000_000);

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-2', 2_000)]);

    const segundaLinea: VentaLineaEnCurso = venta.lineas[1]!;

    expect(segundaLinea.descuentoClienteBps).toBe(1_000);
    expect(segundaLinea.importeFinalMicros).toBe(18_000_000);
    expect(venta.totalCents).toBe(2_700);
  });

  it('cambia y elimina el descuento del cliente sin destruir un override manual', (): void => {
    const service: VentasService = new VentasService();
    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1', 1_000)]);

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    service.asignarCliente(venta.idTemporal, createCliente('cliente-1', 10));

    service.establecerDescuentoPorcentaje(venta.idTemporal, linea.idTemporal, 2_500);

    expect(linea.descuentoClienteBps).toBe(1_000);
    expect(linea.descuentoManualBps).toBe(2_500);
    expect(linea.importeFinalMicros).toBe(7_500_000);

    service.asignarCliente(venta.idTemporal, createCliente('cliente-2', 5));

    expect(linea.descuentoClienteBps).toBe(500);
    expect(linea.descuentoManualBps).toBe(2_500);
    expect(linea.importeFinalMicros).toBe(7_500_000);

    service.quitarDescuentoPorcentajeManual(venta.idTemporal, linea.idTemporal);

    expect(linea.descuentoBps).toBe(500);
    expect(linea.importeFinalMicros).toBe(9_500_000);

    service.quitarCliente(venta.idTemporal);

    expect(venta.cliente).toBeNull();
    expect(linea.descuentoClienteBps).toBe(0);
    expect(linea.descuentoBps).toBe(0);
    expect(linea.importeFinalMicros).toBe(10_000_000);
  });
});
