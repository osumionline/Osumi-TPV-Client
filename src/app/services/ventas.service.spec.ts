import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
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

const createReserva = (
  reservaPublicId: string,
  lineaPublicId: string,
  clientePublicId: string = 'cliente-1',
  articuloPublicId: string = 'articulo-1',
  unidades: number = 2,
  importeMicros: number = 18_000_000,
): ReservaInterface => {
  const reservaId: number = Number(reservaPublicId.replace(/\D/g, '')) || 1;
  const lineaId: number = Number(lineaPublicId.replace(/\D/g, '')) || 1;
  const clienteId: number = Number(clientePublicId.replace(/\D/g, '')) || 1;
  const articuloId: number = Number(articuloPublicId.replace(/\D/g, '')) || 1;
  const pvpMicros: number = 10_000_000;

  return {
    id: reservaId,
    publicId: reservaPublicId,
    idCliente: clienteId,
    clientePublicId,
    clienteNombre: `Cliente ${clientePublicId}`,
    totalMicros: importeMicros,
    fecha: '2026-08-14',
    lineas: [
      {
        id: lineaId,
        publicId: lineaPublicId,
        idArticulo: articuloId,
        articuloPublicId,
        localizador: articuloId,
        marca: 'Marca',
        nombre: `Artículo ${articuloPublicId}`,
        pucMicros: 5_000_000,
        pvpMicros,
        ivaBps: 2_100,
        importeMicros,
        descuentoBps: 1_000,
        importeDescuentoMicros: Math.max(unidades * pvpMicros - importeMicros, 0),
        unidades,
      },
    ],
  };
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

  it('añade cada Varios como una línea independiente', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    const primeraLinea: VentaLineaEnCurso = service.agregarVarios(venta.idTemporal, {
      descripcion: 'Varios',
      pvpMicros: 5_000_000,
      ivaBps: 2_100,
    });

    const segundaLinea: VentaLineaEnCurso = service.agregarVarios(venta.idTemporal, {
      descripcion: 'Otro varios',
      pvpMicros: 7_500_000,
      ivaBps: 2_100,
    });

    expect(venta.lineas).toHaveLength(2);

    expect(primeraLinea.idTemporal).not.toBe(segundaLinea.idTemporal);

    expect(venta.totalMicros).toBe(12_500_000);
  });

  it('aplica el descuento del cliente a un Varios nuevo', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.asignarCliente(venta.idTemporal, createCliente('cliente-1', 10));

    const linea: VentaLineaEnCurso = service.agregarVarios(venta.idTemporal, {
      descripcion: 'Varios',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    expect(linea.descuentoClienteBps).toBe(1_000);

    expect(linea.importeFinalMicros).toBe(9_000_000);
  });

  it('actualiza los datos de un Varios sin sustituir la línea', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    const linea: VentaLineaEnCurso = service.agregarVarios(venta.idTemporal, {
      descripcion: 'Varios',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    const idTemporal: string = linea.idTemporal;

    service.actualizarVarios(venta.idTemporal, linea.idTemporal, {
      descripcion: 'Trabajo especial',
      pvpMicros: 20_000_000,
      ivaBps: 1_000,
    });

    expect(venta.lineas).toHaveLength(1);
    expect(venta.lineas[0]).toBe(linea);

    expect(linea.idTemporal).toBe(idTemporal);

    expect(linea.descripcion).toBe('Trabajo especial');

    expect(linea.pvpMicros).toBe(20_000_000);

    expect(linea.ivaBps).toBe(1_000);
  });

  it('recalcula la venta al modificar el PVP de un Varios', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.asignarCliente(venta.idTemporal, createCliente('cliente-1', 10));

    const linea: VentaLineaEnCurso = service.agregarVarios(venta.idTemporal, {
      descripcion: 'Varios',
      pvpMicros: 10_000_000,
      ivaBps: 2_100,
    });

    service.cambiarCantidad(venta.idTemporal, linea.idTemporal, 2);

    expect(venta.totalMicros).toBe(18_000_000);

    service.actualizarVarios(venta.idTemporal, linea.idTemporal, {
      descripcion: 'Varios modificado',
      pvpMicros: 15_000_000,
      ivaBps: 1_000,
    });

    expect(venta.totalMicros).toBe(27_000_000);

    expect(linea.descuentoClienteBps).toBe(1_000);

    expect(linea.cantidad).toBe(2);
  });

  it('impide utilizar actualizarVarios sobre una línea de artículo', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1', 1_000)]);

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    const descripcionOriginal: string = linea.descripcion;

    const pvpOriginalMicros: number = linea.pvpMicros;

    expect((): void =>
      service.actualizarVarios(venta.idTemporal, linea.idTemporal, {
        descripcion: 'No debería cambiar',
        pvpMicros: 20_000_000,
        ivaBps: 2_100,
      }),
    ).toThrow('Solo se pueden modificar como Varios las líneas de tipo Varios.');

    expect(linea.descripcion).toBe(descripcionOriginal);

    expect(linea.pvpMicros).toBe(pvpOriginalMicros);
  });

  it('mantiene separadas la devolución y una nueva compra del mismo artículo', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.aplicarDevolucion(
      venta.idTemporal,
      {
        id: 50,
        publicId: 'venta-original',
        serie: '',
        numero: 100,
        fecha: '2026-08-01',
        cliente: null,
        totalCents: 1000,
        pagos: [],
        lineas: [],
      },
      [
        {
          linea: {
            id: 100,
            publicId: 'linea-original',
            idArticulo: 1,
            articuloPublicId: 'articulo-1',
            localizador: 10,
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
          unidades: 1,
        },
      ],
    );

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1', 1_000)]);

    expect(venta.lineas).toHaveLength(2);

    expect(venta.lineas[0]?.cantidad).toBe(-1);

    expect(venta.lineas[1]?.cantidad).toBe(1);
  });

  it('no aplica el descuento del cliente a las líneas de devolución', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.asignarCliente(venta.idTemporal, createCliente('cliente-1', 20));

    service.aplicarDevolucion(
      venta.idTemporal,
      {
        id: 50,
        publicId: 'venta-original',
        serie: '',
        numero: 100,
        fecha: '2026-08-01',
        cliente: null,
        totalCents: 1000,
        pagos: [],
        lineas: [],
      },
      [
        {
          linea: {
            id: 100,
            publicId: 'linea-original',
            idArticulo: 1,
            articuloPublicId: 'articulo-1',
            localizador: 10,
            nombre: 'Artículo',
            pucMicros: 0,
            pvpMicros: 10_000_000,
            ivaBps: 2_100,
            importeMicros: 9_000_000,
            descuentoBps: 1_000,
            importeDescuentoMicros: 1_000_000,
            unidades: 1,
            unidadesDevueltas: 0,
            unidadesDisponibles: 1,
            regalo: false,
          },
          unidades: 1,
        },
      ],
    );

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    expect(linea.descuentoClienteBps).toBe(0);

    expect(linea.importeFinalMicros).toBe(-9_000_000);
  });

  it('sustituye la selección de una devolución conservando las líneas normales', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-99', 3_000)]);

    const devolucion = {
      id: 50,
      publicId: 'venta-original',
      serie: '',
      numero: 100,
      fecha: '2026-08-01',
      cliente: null,
      totalCents: 4_000,
      pagos: [],
      lineas: [],
    };

    service.aplicarDevolucion(venta.idTemporal, devolucion, [
      {
        linea: {
          id: 100,
          publicId: 'linea-100',
          idArticulo: 1,
          articuloPublicId: 'articulo-1',
          localizador: 10,
          nombre: 'Artículo 1',
          pucMicros: 0,
          pvpMicros: 10_000_000,
          ivaBps: 2_100,
          importeMicros: 20_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 2,
          unidadesDevueltas: 0,
          unidadesDisponibles: 2,
          regalo: false,
        },
        unidades: 1,
      },
    ]);

    service.aplicarDevolucion(venta.idTemporal, devolucion, [
      {
        linea: {
          id: 200,
          publicId: 'linea-200',
          idArticulo: 2,
          articuloPublicId: 'articulo-2',
          localizador: 20,
          nombre: 'Artículo 2',
          pucMicros: 0,
          pvpMicros: 5_000_000,
          ivaBps: 2_100,
          importeMicros: 10_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 2,
          unidadesDevueltas: 0,
          unidadesDisponibles: 2,
          regalo: false,
        },
        unidades: 2,
      },
    ]);

    expect(venta.lineas).toHaveLength(2);

    const lineaNormal = venta.lineas.find((linea): boolean => !linea.esDevolucion);

    const lineaDevolucion = venta.lineas.find((linea): boolean => linea.esDevolucion);

    expect(lineaNormal?.articuloPublicId).toBe('articulo-99');

    expect(lineaDevolucion?.devolucionOrigen?.id).toBe(200);

    expect(lineaDevolucion?.cantidad).toBe(-2);

    expect(venta.devolucionOrigen?.id).toBe(50);
  });

  it('impide sustituir una devolución por otra perteneciente a otro ticket', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.aplicarDevolucion(
      venta.idTemporal,
      {
        id: 50,
        publicId: 'venta-50',
        serie: '',
        numero: 50,
        fecha: '2026-08-01',
        cliente: null,
        totalCents: 1_000,
        pagos: [],
        lineas: [],
      },
      [
        {
          linea: {
            id: 100,
            publicId: 'linea-100',
            idArticulo: 1,
            articuloPublicId: 'articulo-1',
            localizador: 10,
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
          unidades: 1,
        },
      ],
    );

    expect((): void =>
      service.aplicarDevolucion(
        venta.idTemporal,
        {
          id: 51,
          publicId: 'venta-51',
          serie: '',
          numero: 51,
          fecha: '2026-08-02',
          cliente: null,
          totalCents: 1_000,
          pagos: [],
          lineas: [],
        },
        [
          {
            linea: {
              id: 200,
              publicId: 'linea-200',
              idArticulo: 2,
              articuloPublicId: 'articulo-2',
              localizador: 20,
              nombre: 'Otro',
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
            unidades: 1,
          },
        ],
      ),
    ).toThrow(
      'No se puede iniciar una devolución de otro ticket mientras exista una devolución en curso.',
    );

    expect(venta.devolucionOrigen?.id).toBe(50);

    expect(venta.lineas).toHaveLength(1);

    expect(venta.lineas[0]?.devolucionOrigen?.id).toBe(100);
  });

  it('libera el ticket de devolución al eliminar su última línea', (): void => {
    const service: VentasService = new VentasService();

    const venta: VentaEnCurso = service.crearVenta();

    service.aplicarDevolucion(
      venta.idTemporal,
      {
        id: 50,
        publicId: 'venta-original',
        serie: '',
        numero: 100,
        fecha: '2026-08-01',
        cliente: null,
        totalCents: 1_000,
        pagos: [],
        lineas: [],
      },
      [
        {
          linea: {
            id: 100,
            publicId: 'linea-original',
            idArticulo: 1,
            articuloPublicId: 'articulo-1',
            localizador: 10,
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
          unidades: 1,
        },
      ],
    );

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    service.eliminarLinea(venta.idTemporal, linea.idTemporal);

    expect(venta.devolucionOrigen).toBeNull();

    expect(venta.lineas).toHaveLength(0);
  });

  it('mantiene separadas las líneas del mismo artículo procedentes de reservas distintas', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 20);

    const venta: VentaEnCurso = service.crearVentaDesdeReservas(null, cliente, [
      createReserva('reserva-1', 'linea-101', 'cliente-1', 'articulo-1', 1, 9_000_000),
      createReserva('reserva-2', 'linea-102', 'cliente-1', 'articulo-1', 2, 18_000_000),
    ]);

    expect(venta.lineas).toHaveLength(2);

    expect(venta.lineas[0]?.reservaOrigen?.reservaPublicId).toBe('reserva-1');

    expect(venta.lineas[1]?.reservaOrigen?.reservaPublicId).toBe('reserva-2');

    expect(venta.lineas[0]?.cantidad).toBe(1);

    expect(venta.lineas[1]?.cantidad).toBe(2);

    expect(venta.totalMicros).toBe(27_000_000);
  });

  it('conserva la economía histórica de la reserva y aplica el descuento actual solo a compras nuevas', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 20);

    const venta: VentaEnCurso = service.crearVentaDesdeReservas(null, cliente, [
      createReserva('reserva-1', 'linea-101', 'cliente-1', 'articulo-1', 1, 9_000_000),
    ]);

    const reservada: VentaLineaEnCurso = venta.lineas[0]!;

    expect(reservada.descuentoClienteBps).toBe(0);

    expect(reservada.importeFinalMicros).toBe(9_000_000);

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-2', 1_000)]);

    const nueva: VentaLineaEnCurso = venta.lineas[1]!;

    expect(nueva.descuentoClienteBps).toBe(2_000);

    expect(nueva.importeFinalMicros).toBe(8_000_000);

    expect(venta.totalMicros).toBe(17_000_000);
  });

  it('mantiene separada una nueva compra del mismo artículo reservado', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 0);

    const venta: VentaEnCurso = service.crearVentaDesdeReservas(null, cliente, [
      createReserva('reserva-1', 'linea-101'),
    ]);

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1')]);

    expect(venta.lineas).toHaveLength(2);

    expect(venta.lineas[0]?.esReserva).toBe(true);

    expect(venta.lineas[0]?.cantidad).toBe(2);

    expect(venta.lineas[1]?.esReserva).toBe(false);

    expect(venta.lineas[1]?.cantidad).toBe(1);

    service.agregarArticulos(venta.idTemporal, [createArticulo('articulo-1')]);

    expect(venta.lineas).toHaveLength(2);

    expect(venta.lineas[0]?.cantidad).toBe(2);

    expect(venta.lineas[1]?.cantidad).toBe(2);
  });

  it('impide cambiar o eliminar el cliente mientras haya reservas cargadas', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 10);

    const venta: VentaEnCurso = service.crearVentaDesdeReservas(null, cliente, [
      createReserva('reserva-1', 'linea-101'),
    ]);

    expect((): void =>
      service.asignarCliente(venta.idTemporal, createCliente('cliente-2', 5)),
    ).toThrow('No se puede cambiar el cliente mientras haya reservas cargadas en la venta.');

    expect((): void => service.quitarCliente(venta.idTemporal)).toThrow(
      'No se puede eliminar el cliente mientras haya reservas cargadas en la venta.',
    );

    expect(venta.cliente).toBe(cliente);
  });

  it('conserva el origen de la reserva aunque se elimine su línea visible', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 0);

    const venta: VentaEnCurso = service.crearVentaDesdeReservas(null, cliente, [
      createReserva('reserva-1', 'linea-101'),
    ]);

    const linea: VentaLineaEnCurso = venta.lineas[0]!;

    service.eliminarLinea(venta.idTemporal, linea.idTemporal);

    expect(venta.lineas).toHaveLength(0);

    expect(venta.tieneReservas).toBe(true);

    expect(venta.reservasOrigen).toHaveLength(1);

    expect(venta.reservasOrigen[0]?.lineas).toHaveLength(1);

    expect(venta.reservasOrigen[0]?.lineas[0]?.lineaPublicId).toBe('linea-101');

    expect((): void => service.quitarCliente(venta.idTemporal)).toThrow();
  });

  it('rechaza cargar conjuntamente reservas de clientes distintos sin abrir una venta', (): void => {
    const service: VentasService = new VentasService();

    const cliente: Cliente = createCliente('cliente-1', 0);

    expect((): VentaEnCurso =>
      service.crearVentaDesdeReservas(null, cliente, [
        createReserva('reserva-1', 'linea-101', 'cliente-1'),
        createReserva('reserva-2', 'linea-102', 'cliente-2'),
      ]),
    ).toThrow('Todas las reservas seleccionadas deben pertenecer al mismo cliente.');

    expect(service.ventas()).toHaveLength(0);
  });
});
