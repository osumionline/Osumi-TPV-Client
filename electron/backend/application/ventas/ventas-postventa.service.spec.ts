import VentasHistoricoService from '@backend/application/ventas/ventas-historico.service';
import VentasPostventaService from '@backend/application/ventas/ventas-postventa.service';
import type VentasHistoricoRepository from '@backend/contracts/ventas/ventas-historico.repository.interface';
import type VentasPostventaRepository from '@backend/contracts/ventas/ventas-postventa.repository.interface';
import type {
  VentaHistoricoDetalleRecord,
  VentasHistoricoResultadoRecord,
} from '@backend/domain/ventas/venta-historico-record.interface';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let postventaRepository: FakeVentasPostventaRepository;
let historicoRepository: FakeVentasHistoricoRepository;
let service: VentasPostventaService;

describe('VentasPostventaService', (): void => {
  beforeEach((): void => {
    postventaRepository = new FakeVentasPostventaRepository();
    historicoRepository = new FakeVentasHistoricoRepository();

    const historicoService: VentasHistoricoService = new VentasHistoricoService(
      historicoRepository,
    );

    service = new VentasPostventaService(postventaRepository, historicoService);
  });

  it('normaliza el cliente, ejecuta la corrección y devuelve el detalle actualizado', async (): Promise<void> => {
    historicoRepository.detalleResult = createDetalleRecord({
      clientePublicId: 'cliente-2',
      clienteNombre: 'Cliente dos',
      clienteEmail: 'cliente2@example.com',
    });

    const detalle: VentaHistoricoDetalle = await service.cambiarCliente({
      idVenta: 15,
      clientePublicId: '  cliente-2  ',
    });

    expect(postventaRepository.lastCambiarClienteVentaId).toBe(15);
    expect(postventaRepository.lastClientePublicId).toBe('cliente-2');

    expect(historicoRepository.lastDetalleVentaId).toBe(15);

    expect(detalle.cliente).toEqual({
      publicId: 'cliente-2',
      nombre: 'Cliente dos',
      email: 'cliente2@example.com',
    });
  });

  it('permite quitar el cliente de una venta', async (): Promise<void> => {
    historicoRepository.detalleResult = createDetalleRecord({
      clientePublicId: null,
      clienteNombre: null,
    });

    const detalle: VentaHistoricoDetalle = await service.cambiarCliente({
      idVenta: 15,
      clientePublicId: null,
    });

    expect(postventaRepository.lastCambiarClienteVentaId).toBe(15);
    expect(postventaRepository.lastClientePublicId).toBeNull();

    expect(detalle.cliente).toBeNull();
  });

  it('normaliza el tipo de pago y devuelve el pago actualizado', async (): Promise<void> => {
    historicoRepository.detalleResult = createDetalleRecord({
      tipoPagoPublicId: 'tipo-pago-tarjeta',
      tipoPagoNombre: 'Tarjeta',
    });

    const detalle: VentaHistoricoDetalle = await service.cambiarTipoPago({
      idVenta: 15,
      tipoPagoPublicId: '  tipo-pago-tarjeta  ',
    });

    expect(postventaRepository.lastCambiarTipoPagoVentaId).toBe(15);
    expect(postventaRepository.lastTipoPagoPublicId).toBe('tipo-pago-tarjeta');

    expect(historicoRepository.lastDetalleVentaId).toBe(15);

    expect(detalle.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        nombre: 'Tarjeta',
        importeCents: 900,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);
  });

  it('rechaza identificadores de venta no válidos antes de acceder al repository', async (): Promise<void> => {
    await expect(
      service.cambiarCliente({
        idVenta: 0,
        clientePublicId: null,
      }),
    ).rejects.toThrow('El identificador de la venta no es válido.');

    await expect(
      service.cambiarTipoPago({
        idVenta: -1,
        tipoPagoPublicId: 'tipo-pago-tarjeta',
      }),
    ).rejects.toThrow('El identificador de la venta no es válido.');

    expect(postventaRepository.cambiarClienteCalls).toBe(0);
    expect(postventaRepository.cambiarTipoPagoCalls).toBe(0);
  });

  it('rechaza publicIds vacíos antes de acceder al repository', async (): Promise<void> => {
    await expect(
      service.cambiarCliente({
        idVenta: 15,
        clientePublicId: '   ',
      }),
    ).rejects.toThrow('El identificador del cliente no es válido.');

    await expect(
      service.cambiarTipoPago({
        idVenta: 15,
        tipoPagoPublicId: '   ',
      }),
    ).rejects.toThrow('El identificador del tipo de pago no es válido.');

    expect(postventaRepository.cambiarClienteCalls).toBe(0);
    expect(postventaRepository.cambiarTipoPagoCalls).toBe(0);
  });

  it('rechaza la operación si el detalle desaparece después de una corrección', async (): Promise<void> => {
    historicoRepository.detalleResult = null;

    await expect(
      service.cambiarCliente({
        idVenta: 15,
        clientePublicId: null,
      }),
    ).rejects.toThrow('La venta modificada ya no se encuentra disponible.');

    expect(postventaRepository.cambiarClienteCalls).toBe(1);
    expect(historicoRepository.findDetalleCalls).toBe(1);
  });
});

class FakeVentasPostventaRepository implements VentasPostventaRepository {
  cambiarClienteCalls: number = 0;
  cambiarTipoPagoCalls: number = 0;

  lastCambiarClienteVentaId: number | null = null;
  lastClientePublicId: string | null = null;

  lastCambiarTipoPagoVentaId: number | null = null;
  lastTipoPagoPublicId: string | null = null;

  /**
   * Registra una solicitud simulada de cambio de cliente.
   */
  cambiarCliente(idVenta: number, clientePublicId: string | null): Promise<void> {
    this.cambiarClienteCalls++;
    this.lastCambiarClienteVentaId = idVenta;
    this.lastClientePublicId = clientePublicId;

    return Promise.resolve();
  }

  /**
   * Registra una solicitud simulada de cambio de tipo de pago.
   */
  cambiarTipoPago(idVenta: number, tipoPagoPublicId: string): Promise<void> {
    this.cambiarTipoPagoCalls++;
    this.lastCambiarTipoPagoVentaId = idVenta;
    this.lastTipoPagoPublicId = tipoPagoPublicId;

    return Promise.resolve();
  }
}

class FakeVentasHistoricoRepository implements VentasHistoricoRepository {
  findDetalleCalls: number = 0;

  lastDetalleVentaId: number | null = null;

  detalleResult: VentaHistoricoDetalleRecord | null = null;

  /**
   * Devuelve un histórico vacío porque estos tests
   * solo necesitan recuperar el detalle individual.
   */
  findByPeriod(): Promise<VentasHistoricoResultadoRecord> {
    return Promise.resolve({
      ventas: [],
      resumen: {
        numeroVentas: 0,
        totalCents: 0,
        ticketMedioCents: 0,
        beneficioCents: 0,
        totalesPorTipoPago: [],
      },
    });
  }

  /**
   * Devuelve el detalle configurado para el caso de test.
   */
  findDetalleByVentaId(idVenta: number): Promise<VentaHistoricoDetalleRecord | null> {
    this.findDetalleCalls++;
    this.lastDetalleVentaId = idVenta;

    return Promise.resolve(this.detalleResult);
  }
}

/**
 * Construye un detalle histórico mínimo configurable para los tests.
 */
function createDetalleRecord(
  options: {
    readonly clientePublicId?: string | null;
    readonly clienteNombre?: string | null;
    readonly clienteEmail?: string | null;
    readonly tipoPagoPublicId?: string;
    readonly tipoPagoNombre?: string;
  } = {},
): VentaHistoricoDetalleRecord {
  const clientePublicId: string | null = options.clientePublicId ?? null;
  const clienteNombre: string | null = options.clienteNombre ?? null;
  const clienteEmail: string | null = options.clienteEmail ?? null;

  return {
    id: 15,
    publicId: 'venta-15',
    serie: '',
    numero: 15,
    fecha: '2026-08-25T10:30:00.000Z',
    empleadoNombre: 'Empleado test',
    cliente:
      clientePublicId === null || clienteNombre === null
        ? null
        : {
            publicId: clientePublicId,
            nombre: clienteNombre,
            email: clienteEmail,
          },
    totalCents: 900,
    pagos: [
      {
        tipoPagoPublicId: options.tipoPagoPublicId ?? 'tipo-pago-efectivo',
        nombre: options.tipoPagoNombre ?? 'Efectivo',
        importeCents: 900,
        entregadoCents:
          (options.tipoPagoPublicId ?? 'tipo-pago-efectivo') === 'tipo-pago-efectivo' ? 900 : null,
        cambioCents: 0,
      },
    ],
    lineas: [
      {
        id: 100,
        localizador: 1,
        marca: 'Marca test',
        descripcion: 'Artículo test',
        unidades: 1,
        pvpMicros: 10_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        importeMicros: 9_000_000,
        regalo: false,
      },
    ],
    numeroPagos: 1,
    cajaAbierta: true,
    facturada: false,
    tieneLineasPositivas: true,
    ticketBaiEstado: 'no_aplica',
    tieneIncidenciaTicketBai: false,
  };
}
