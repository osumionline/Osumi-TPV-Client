import { TestBed } from '@angular/core/testing';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type VentaDevolucionSelectorState from '@model/ventas/venta-devolucion-selector-state.interface';
import VentaEnCurso from '@model/ventas/venta-en-curso.model';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import ApplicationLoggingService from '@services/application/application-logging.service';
import VentasDevolucionesService from '@services/ventas/ventas-devoluciones.service';

interface TestLogEvent {
  readonly area: string;
  readonly operation: string;
  readonly message: string;
  readonly error?: unknown;
  readonly context?: Readonly<Record<string, string | number | boolean | null>>;
}

/**
 * Logger controlado utilizado por los tests
 * de reconciliación de devoluciones.
 */
class TestApplicationLoggingService {
  readonly warnEvents: TestLogEvent[] = [];

  /**
   * Conserva los avisos solicitados por el servicio.
   */
  warn(event: TestLogEvent): void {
    this.warnEvents.push(event);
  }
}

describe('VentasDevolucionesService', (): void => {
  let loggingService: TestApplicationLoggingService;
  let service: VentasDevolucionesService;

  beforeEach((): void => {
    loggingService = new TestApplicationLoggingService();

    TestBed.configureTestingModule({
      providers: [
        VentasDevolucionesService,
        {
          provide: ApplicationLoggingService,
          useValue: loggingService,
        },
      ],
    });

    service = TestBed.inject(VentasDevolucionesService);
  });

  afterEach((): void => {
    TestBed.resetTestingModule();
  });

  it('reconstruye una devolución en curso sin registrar avisos', (): void => {
    const devolucion: VentaDevolucionInterface = createDevolucion();
    const venta: VentaEnCurso = createVentaConDevolucion(devolucion, 1);

    const result: VentaDevolucionSelectorState = service.reconcileDevolucionEnCurso(
      venta,
      devolucion,
    );

    expect(result.devolucion).toBe(devolucion);

    expect(result.seleccionInicial).toEqual([
      {
        linea: devolucion.lineas[0],
        unidades: 1,
      },
    ]);

    expect(loggingService.warnEvents).toEqual([]);
  });

  it('registra que el ticket original ha desaparecido', (): void => {
    const devolucion: VentaDevolucionInterface = createDevolucion();
    const venta: VentaEnCurso = createVentaConDevolucion(devolucion, 1);

    expect((): VentaDevolucionSelectorState =>
      service.reconcileDevolucionEnCurso(venta, null),
    ).toThrow('No se ha podido recuperar el ticket original de la devolución.');

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'reconcile-return',
        message: 'No se ha podido reconciliar una devolución con su venta histórica.',
        error: expect.objectContaining({
          message: 'No se ha podido recuperar el ticket original de la devolución.',
        }),
        context: {
          sourceSaleId: 50,
          reason: 'source-missing',
        },
      },
    ]);
  });

  it('registra que el ticket recuperado no coincide con el origen local', (): void => {
    const devolucion: VentaDevolucionInterface = createDevolucion();
    const venta: VentaEnCurso = createVentaConDevolucion(devolucion, 1);

    const distinta: VentaDevolucionInterface = {
      ...devolucion,
      publicId: 'venta-distinta',
    };

    expect((): VentaDevolucionSelectorState =>
      service.reconcileDevolucionEnCurso(venta, distinta),
    ).toThrow('El ticket recuperado no coincide con la devolución en curso.');

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'reconcile-return',
        message: 'No se ha podido reconciliar una devolución con su venta histórica.',
        error: expect.objectContaining({
          message: 'El ticket recuperado no coincide con la devolución en curso.',
        }),
        context: {
          sourceSaleId: 50,
          returnedSaleId: 50,
          reason: 'source-mismatch',
        },
      },
    ]);
  });

  it('registra que una línea histórica de la devolución ha desaparecido', (): void => {
    const devolucion: VentaDevolucionInterface = createDevolucion();
    const venta: VentaEnCurso = createVentaConDevolucion(devolucion, 1);

    const sinLineas: VentaDevolucionInterface = {
      ...devolucion,
      lineas: [],
    };

    expect((): VentaDevolucionSelectorState =>
      service.reconcileDevolucionEnCurso(venta, sinLineas),
    ).toThrow('Una de las líneas de la devolución ya no existe en el ticket original.');

    expect(loggingService.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'reconcile-return',
        message: 'No se ha podido reconciliar una devolución con su venta histórica.',
        error: expect.objectContaining({
          message: 'Una de las líneas de la devolución ya no existe en el ticket original.',
        }),
        context: {
          sourceSaleId: 50,
          sourceLineId: 100,
          reason: 'line-missing',
        },
      },
    ]);
  });

  it('trata una reducción de disponibilidad como estado de negocio sin generar log', (): void => {
    const devolucion: VentaDevolucionInterface = createDevolucion();
    const venta: VentaEnCurso = createVentaConDevolucion(devolucion, 2);

    const disponibilidadActualizada: VentaDevolucionInterface = {
      ...devolucion,
      lineas: devolucion.lineas.map((linea) => ({
        ...linea,
        unidadesDisponibles: 1,
      })),
    };

    expect((): VentaDevolucionSelectorState =>
      service.reconcileDevolucionEnCurso(venta, disponibilidadActualizada),
    ).toThrow('La disponibilidad del ticket ha cambiado y la devolución debe revisarse.');

    expect(loggingService.warnEvents).toEqual([]);
  });

  it('rechaza reconciliar una venta sin devolución activa sin registrar incidencia', (): void => {
    const venta: VentaEnCurso = new VentaEnCurso(1);

    expect((): VentaDevolucionSelectorState =>
      service.reconcileDevolucionEnCurso(venta, createDevolucion()),
    ).toThrow('La venta no contiene una devolución en curso.');

    expect(loggingService.warnEvents).toEqual([]);
  });
});

/**
 * Construye una venta histórica reutilizable
 * para los casos de reconciliación.
 */
function createDevolucion(): VentaDevolucionInterface {
  return {
    id: 50,
    publicId: 'venta-original',
    serie: '',
    numero: 100,
    fecha: '2026-08-01T10:00:00.000Z',
    cliente: null,
    totalCents: 2_000,
    pagos: [],
    lineas: [
      {
        id: 100,
        publicId: 'linea-original',
        idArticulo: 1,
        articuloPublicId: 'articulo-1',
        localizador: 10,
        nombre: 'Artículo',
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
    ],
  };
}

/**
 * Construye una venta abierta que ya contiene
 * una selección de devolución.
 */
function createVentaConDevolucion(
  devolucion: VentaDevolucionInterface,
  unidades: number,
): VentaEnCurso {
  const linea = devolucion.lineas[0];

  if (linea === undefined) {
    throw new Error('El fixture de devolución debe contener una línea.');
  }

  const venta: VentaEnCurso = new VentaEnCurso(1);

  venta.setDevolucion(
    {
      id: devolucion.id,
      publicId: devolucion.publicId,
      serie: devolucion.serie,
      numero: devolucion.numero,
    },
    [new VentaLineaEnCurso().fromDevolucion(linea, unidades)],
  );

  return venta;
}
