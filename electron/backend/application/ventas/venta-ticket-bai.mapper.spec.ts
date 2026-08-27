import VentaTicketBaiMapper from '@backend/application/ventas/venta-ticket-bai.mapper';
import type { TicketBaiCreateInvoiceRequest } from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ORIGINAL_TIMEZONE: string | undefined = process.env['TZ'];

describe('VentaTicketBaiMapper', (): void => {
  beforeEach((): void => {
    process.env['TZ'] = 'Europe/Madrid';
  });

  afterEach((): void => {
    if (ORIGINAL_TIMEZONE === undefined) {
      delete process.env['TZ'];

      return;
    }

    process.env['TZ'] = ORIGINAL_TIMEZONE;
  });

  it('construye una factura simplificada ordinaria con descuentos separados', (): void => {
    const mapper: VentaTicketBaiMapper = new VentaTicketBaiMapper();

    const request: TicketBaiCreateInvoiceRequest = mapper.map(createTicket());

    expect(request).toEqual({
      fecha: '27/08/2026',
      hora: '16:15:16',
      simplificada: true,
      serie: 'TPV01',
      numero: '000123',
      rectificativa: false,
      retencion: 0,
      modoRecargoEquivalencia: true,

      lineas: [
        {
          descripcion: 'Artículo porcentual',
          cantidad: 2,
          importeUnitario: 8.2645,
          tipoIva: 21,
          tipoReq: 0,
        },
        {
          descripcion: 'Descuento - Artículo porcentual',
          cantidad: 2,
          importeUnitario: -0.8264,
          tipoIva: 21,
          tipoReq: 0,
        },
        {
          descripcion: 'Artículo fijo',
          cantidad: 1,
          importeUnitario: 4.1322,
          tipoIva: 21,
          tipoReq: 0,
        },
        {
          descripcion: 'Descuento - Artículo fijo',
          cantidad: 1,
          importeUnitario: -0.8264,
          tipoIva: 21,
          tipoReq: 0,
        },
      ],

      totalFactura: 22,
    });
  });

  it('representa un regalo como artículo y descuento completo', (): void => {
    const mapper: VentaTicketBaiMapper = new VentaTicketBaiMapper();

    const ticket: VentaTicketInterface = {
      ...createTicket(),
      totalCents: 0,

      lineas: [
        {
          nombre: 'Artículo regalo',
          pvpMicros: 4_200_000,
          ivaBps: 1_000,
          importeMicros: 0,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 2,
          regalo: true,
        },
      ],
    };

    const request = mapper.map(ticket);

    expect(request.lineas).toEqual([
      {
        descripcion: 'Artículo regalo',
        cantidad: 2,
        importeUnitario: 3.8182,
        tipoIva: 10,
        tipoReq: 0,
      },
      {
        descripcion: 'Descuento - Artículo regalo',
        cantidad: 2,
        importeUnitario: -3.8182,
        tipoIva: 10,
        tipoReq: 0,
      },
    ]);

    expect(request.totalFactura).toBe(0);
  });

  it('rechaza una devolución dentro del flujo ordinario', (): void => {
    const mapper: VentaTicketBaiMapper = new VentaTicketBaiMapper();

    const ticket: VentaTicketInterface = {
      ...createTicket(),
      totalCents: -1_000,

      lineas: [
        {
          nombre: 'Artículo devuelto',
          pvpMicros: 10_000_000,
          ivaBps: 2_100,
          importeMicros: -10_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: -1,
          regalo: false,
        },
      ],
    };

    expect((): TicketBaiCreateInvoiceRequest => mapper.map(ticket)).toThrow(
      'La operación no pertenece al flujo TicketBAI ordinario.',
    );
  });

  it('rechaza una operación mixta aunque su total sea positivo', (): void => {
    const mapper: VentaTicketBaiMapper = new VentaTicketBaiMapper();

    const ticket: VentaTicketInterface = {
      ...createTicket(),

      lineas: [
        ...createTicket().lineas,

        {
          nombre: 'Devolución parcial',
          pvpMicros: 5_000_000,
          ivaBps: 2_100,
          importeMicros: -5_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: -1,
          regalo: false,
        },
      ],
    };

    expect((): TicketBaiCreateInvoiceRequest => mapper.map(ticket)).toThrow(
      'Una línea no pertenece al flujo TicketBAI ordinario.',
    );
  });
});

/**
 * Construye un snapshot de venta ordinaria
 * suficiente para probar el mapping fiscal.
 */
function createTicket(): VentaTicketInterface {
  return {
    id: 123,
    publicId: 'venta-123',
    serie: '',
    numero: 123,
    fecha: '2026-08-27T14:15:16.000Z',
    empleadoNombre: 'Empleado test',
    clienteNombre: null,
    totalCents: 2_200,
    ticketRevision: 1,
    ticketPdfRevision: 0,
    pagos: [],

    lineas: [
      {
        nombre: 'Artículo porcentual',
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 18_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        unidades: 2,
        regalo: false,
      },
      {
        nombre: 'Artículo fijo',
        pvpMicros: 5_000_000,
        ivaBps: 2_100,
        importeMicros: 4_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 1_000_000,
        unidades: 1,
        regalo: false,
      },
    ],
  };
}
