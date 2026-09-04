import VentasHistoricoService from '@backend/application/ventas/ventas-historico.service';
import type VentasHistoricoRepository from '@backend/contracts/ventas/ventas-historico.repository.interface';
import type {
  VentaHistoricoDetalleRecord,
  VentasHistoricoResultadoRecord,
} from '@backend/domain/ventas/venta-historico-record.interface';
import type {
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ORIGINAL_TIMEZONE: string | undefined = process.env['TZ'];

let repository: FakeVentasHistoricoRepository;
let service: VentasHistoricoService;

describe('VentasHistoricoService', (): void => {
  beforeEach((): void => {
    process.env['TZ'] = 'Europe/Madrid';

    repository = new FakeVentasHistoricoRepository();
    service = new VentasHistoricoService(repository);
  });

  afterEach((): void => {
    if (ORIGINAL_TIMEZONE === undefined) {
      delete process.env['TZ'];

      return;
    }

    process.env['TZ'] = ORIGINAL_TIMEZONE;
  });

  it('convierte una fecha civil completa al intervalo UTC del terminal', async (): Promise<void> => {
    const result: VentasHistoricoResultado = await service.findByPeriod({
      desde: '2026-08-25',
      hasta: '2026-08-25',
    });

    expect(repository.lastDesde).toBe('2026-08-24T22:00:00.000Z');
    expect(repository.lastHastaExclusive).toBe('2026-08-25T22:00:00.000Z');
    expect(repository.lastClientePublicId).toBeNull();

    expect(result).toEqual({
      ventas: [],
      resumen: {
        numeroVentas: 0,
        totalCents: 0,
        ticketMedioCents: 0,
        beneficioCents: 0,
        totalesPorTipoPago: [],
      },
    });
  });

  it('normaliza y propaga el filtro opcional de cliente', async (): Promise<void> => {
    await service.findByPeriod({
      desde: '2026-08-25',
      hasta: '2026-08-31',
      clientePublicId: '  cliente-1  ',
    });

    expect(repository.lastClientePublicId).toBe('cliente-1');
    expect(repository.findByPeriodCalls).toBe(1);

    await expect(
      service.findByPeriod({
        desde: '2026-08-25',
        hasta: '2026-08-31',
        clientePublicId: '   ',
      }),
    ).rejects.toThrow('El identificador del cliente del histórico no es válido.');

    expect(repository.findByPeriodCalls).toBe(1);
  });

  it('propaga el estado TicketBAI de las ventas del histórico', async (): Promise<void> => {
    repository.periodResult = {
      ventas: [
        {
          id: 1,
          publicId: 'venta-correcta',
          serie: '',
          numero: 1,
          fecha: '2026-08-25T10:00:00.000Z',
          totalCents: 1_000,
          clienteNombre: null,
          pagos: [],
          ticketBaiEstado: 'correcto',
          tieneIncidenciaTicketBai: false,
        },
        {
          id: 2,
          publicId: 'venta-pendiente',
          serie: '',
          numero: 2,
          fecha: '2026-08-25T11:00:00.000Z',
          totalCents: 2_000,
          clienteNombre: null,
          pagos: [],
          ticketBaiEstado: 'pendiente',
          tieneIncidenciaTicketBai: false,
        },
      ],
      resumen: {
        numeroVentas: 2,
        totalCents: 3_000,
        ticketMedioCents: 1_500,
        beneficioCents: 0,
        totalesPorTipoPago: [],
      },
    };

    const result: VentasHistoricoResultado = await service.findByPeriod({
      desde: '2026-08-25',
      hasta: '2026-08-25',
    });

    expect(result.ventas[0]?.ticketBaiEstado).toBe('correcto');
    expect(result.ventas[0]?.tieneIncidenciaTicketBai).toBe(false);
    expect(result.ventas[1]?.ticketBaiEstado).toBe('pendiente');
    expect(result.ventas[1]?.tieneIncidenciaTicketBai).toBe(false);
  });

  it('respeta un día de 23 horas durante el cambio al horario de verano', async (): Promise<void> => {
    await service.findByPeriod({
      desde: '2026-03-29',
      hasta: '2026-03-29',
    });

    expect(repository.lastDesde).toBe('2026-03-28T23:00:00.000Z');
    expect(repository.lastHastaExclusive).toBe('2026-03-29T22:00:00.000Z');
  });

  it('rechaza fechas civiles inválidas y rangos invertidos', async (): Promise<void> => {
    await expect(
      service.findByPeriod({
        desde: '2026-02-30',
        hasta: '2026-03-01',
      }),
    ).rejects.toThrow('La fecha inicial del histórico no es válida.');

    await expect(
      service.findByPeriod({
        desde: '2026-08-26',
        hasta: '2026-08-25',
      }),
    ).rejects.toThrow('La fecha inicial del histórico no puede ser posterior a la fecha final.');

    expect(repository.findByPeriodCalls).toBe(0);
  });

  it('transforma el detalle y deriva las capacidades postventa desde hechos persistidos', async (): Promise<void> => {
    repository.detalleResult = {
      id: 15,
      publicId: 'venta-historico-15',
      serie: '',
      numero: 15,
      fecha: '2026-08-25T10:30:00.000Z',
      empleadoNombre: 'Empleado test',
      cliente: {
        publicId: 'cliente-1',
        nombre: 'Cliente test',
        email: 'cliente@example.com',
      },
      totalCents: 2_000,
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          nombre: 'Efectivo',
          importeCents: 2_000,
          entregadoCents: 2_500,
          cambioCents: 500,
        },
      ],
      lineas: [
        {
          id: 100,
          localizador: 10,
          marca: 'Marca A',
          descripcion: 'Artículo comprado',
          unidades: 3,
          pvpMicros: 10_000_000,
          descuentoBps: 1_000,
          importeDescuentoMicros: 0,
          importeMicros: 27_000_000,
          regalo: false,
        },
        {
          id: 101,
          localizador: 20,
          marca: 'Marca B',
          descripcion: 'Artículo devuelto',
          unidades: -1,
          pvpMicros: 7_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          importeMicros: -7_000_000,
          regalo: false,
        },
      ],
      numeroPagos: 1,
      cajaAbierta: true,
      facturada: false,
      tieneLineasPositivas: true,
      ticketBaiEstado: 'incidencia',
      ticketBaiUltimoError: 'TicketBAI ha rechazado la factura.',
      tieneIncidenciaTicketBai: true,
      puedeProcesarTicketBai: false,
      puedeComprobarTicketBai: false,
      puedeReintentarTicketBai: true,
    };

    const detalle: VentaHistoricoDetalle | null = await service.findDetalleByVentaId(15);

    expect(detalle).not.toBeNull();

    expect(detalle).toEqual({
      id: 15,
      publicId: 'venta-historico-15',
      serie: '',
      numero: 15,
      fecha: '2026-08-25T10:30:00.000Z',
      empleadoNombre: 'Empleado test',
      cliente: {
        publicId: 'cliente-1',
        nombre: 'Cliente test',
        email: 'cliente@example.com',
      },
      totalCents: 2_000,
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          nombre: 'Efectivo',
          importeCents: 2_000,
          entregadoCents: 2_500,
          cambioCents: 500,
        },
      ],
      lineas: [
        {
          id: 100,
          localizador: 10,
          marca: 'Marca A',
          descripcion: 'Artículo comprado',
          unidades: 3,
          pvpMicros: 10_000_000,
          descuentoBps: 1_000,
          importeDescuentoMicros: 3_000_000,
          importeMicros: 27_000_000,
          regalo: false,
        },
        {
          id: 101,
          localizador: 20,
          marca: 'Marca B',
          descripcion: 'Artículo devuelto',
          unidades: -1,
          pvpMicros: 7_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          importeMicros: -7_000_000,
          regalo: false,
        },
      ],
      totalUnidades: 2,
      totalDescuentoMicros: 3_000_000,
      ticketBaiEstado: 'incidencia',
      ticketBaiUltimoError: 'TicketBAI ha rechazado la factura.',
      capacidades: {
        puedeCambiarCliente: true,
        puedeCambiarTipoPago: true,
        puedeImprimirTicketRegalo: true,
        puedeProcesarTicketBai: false,
        puedeComprobarTicketBai: false,
        puedeReintentarTicketBai: true,
      },
    });
  });

  it('mantiene el cambio de cliente y bloquea las demás capacidades no permitidas', async (): Promise<void> => {
    repository.detalleResult = {
      id: 20,
      publicId: 'venta-historico-20',
      serie: '',
      numero: 20,
      fecha: '2026-08-25T11:00:00.000Z',
      empleadoNombre: 'Empleado test',
      cliente: null,
      totalCents: -1_000,
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          nombre: 'Efectivo',
          importeCents: -500,
          entregadoCents: null,
          cambioCents: 0,
        },
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          nombre: 'Tarjeta',
          importeCents: -500,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
      lineas: [
        {
          id: 200,
          localizador: 1,
          marca: 'Marca test',
          descripcion: 'Artículo devuelto',
          unidades: -1,
          pvpMicros: 10_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          importeMicros: -10_000_000,
          regalo: false,
        },
      ],
      numeroPagos: 2,
      cajaAbierta: false,
      facturada: true,
      tieneLineasPositivas: false,
      ticketBaiEstado: 'no_aplica',
      ticketBaiUltimoError: null,
      tieneIncidenciaTicketBai: false,
      puedeProcesarTicketBai: false,
      puedeComprobarTicketBai: false,
      puedeReintentarTicketBai: false,
    };

    const detalle: VentaHistoricoDetalle | null = await service.findDetalleByVentaId(20);

    expect(detalle?.ticketBaiEstado).toBe('no_aplica');
    expect(detalle?.capacidades).toEqual({
      puedeCambiarCliente: true,
      puedeCambiarTipoPago: false,
      puedeImprimirTicketRegalo: false,
      puedeProcesarTicketBai: false,
      puedeComprobarTicketBai: false,
      puedeReintentarTicketBai: false,
    });
  });

  it('valida el identificador y conserva null para una venta inexistente', async (): Promise<void> => {
    await expect(service.findDetalleByVentaId(0)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    expect(repository.findDetalleCalls).toBe(0);

    repository.detalleResult = null;

    const detalle: VentaHistoricoDetalle | null = await service.findDetalleByVentaId(999);

    expect(detalle).toBeNull();
    expect(repository.lastDetalleVentaId).toBe(999);
  });
});

class FakeVentasHistoricoRepository implements VentasHistoricoRepository {
  findByPeriodCalls: number = 0;
  findDetalleCalls: number = 0;
  lastDesde: string | null = null;
  lastHastaExclusive: string | null = null;
  lastDetalleVentaId: number | null = null;
  lastClientePublicId: string | null = null;

  periodResult: VentasHistoricoResultadoRecord = {
    ventas: [],
    resumen: {
      numeroVentas: 0,
      totalCents: 0,
      ticketMedioCents: 0,
      beneficioCents: 0,
      totalesPorTipoPago: [],
    },
  };

  detalleResult: VentaHistoricoDetalleRecord | null = null;

  /**
   * Registra el intervalo recibido y devuelve el resultado preparado por el test.
   */
  findByPeriod(
    desde: string,
    hastaExclusive: string,
    clientePublicId: string | null = null,
  ): Promise<VentasHistoricoResultadoRecord> {
    this.findByPeriodCalls++;
    this.lastDesde = desde;
    this.lastHastaExclusive = hastaExclusive;
    this.lastClientePublicId = clientePublicId;

    return Promise.resolve(this.periodResult);
  }

  /**
   * Registra la venta solicitada y devuelve el detalle preparado por el test.
   */
  findDetalleByVentaId(idVenta: number): Promise<VentaHistoricoDetalleRecord | null> {
    this.findDetalleCalls++;
    this.lastDetalleVentaId = idVenta;

    return Promise.resolve(this.detalleResult);
  }
}
