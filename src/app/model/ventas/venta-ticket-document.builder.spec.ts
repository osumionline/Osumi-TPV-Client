import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import buildVentaTicketDocument from '@model/ventas/venta-ticket-document.builder';

describe('buildVentaTicketDocument', (): void => {
  const appData: AppData = {
    schemaVersion: 1,
    installedAt: '2026-08-01T10:00:00',
    nombre: 'Empresa & Compañía',
    nombreComercial: 'Mi comercio',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',
    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    tipoIva: 'iva',
    ivaList: [21, 10, 4],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    fechaCad: false,
    empleados: false,
  };

  const ticket: VentaTicketInterface = {
    id: 123,
    publicId: 'venta-public-id',
    serie: 'A',
    numero: 456,
    fecha: '2026-08-21T16:30:00.000Z',
    empleadoNombre: 'Empleado & Prueba',
    clienteNombre: 'Cliente <Prueba>',
    totalCents: 2_000,
    pagos: [
      {
        nombre: 'Tarjeta <VISA>',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
      {
        nombre: 'Efectivo',
        importeCents: 1_000,
        entregadoCents: 2_000,
        cambioCents: 1_000,
      },
    ],
    lineas: [
      {
        nombre: 'Artículo <script>alert("x")</script>',
        pvpMicros: 12_100_000,
        ivaBps: 2_100,
        importeMicros: 10_890_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
      },
      {
        nombre: 'Artículo regalo',
        pvpMicros: 9_110_000,
        ivaBps: 2_100,
        importeMicros: 0,
        descuentoBps: 0,
        importeDescuentoMicros: 9_110_000,
        unidades: 1,
        regalo: true,
      },
      {
        nombre: 'Ajuste',
        pvpMicros: 9_110_000,
        ivaBps: 2_100,
        importeMicros: 9_110_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
      },
    ],
  };

  it('incluye los datos definitivos de la venta', (): void => {
    const documentHtml: string = buildVentaTicketDocument(appData, ticket);

    expect(documentHtml).toContain('TICKET');
    expect(documentHtml).toContain('F. simplificada A-456');

    expect(documentHtml).toContain('Empleado &amp; Prueba');
    expect(documentHtml).toContain('Cliente &lt;Prueba&gt;');

    expect(documentHtml).toContain('20,00');
  });

  it('incluye pagos, efectivo entregado y cambio', (): void => {
    const documentHtml: string = buildVentaTicketDocument(appData, ticket);

    expect(documentHtml).toContain('Tarjeta &lt;VISA&gt;');
    expect(documentHtml).toContain('Efectivo');
    expect(documentHtml).toContain('Entregado');
    expect(documentHtml).toContain('Cambio');
  });

  it('incluye descuentos, regalos y desglose de IVA', (): void => {
    const documentHtml: string = buildVentaTicketDocument(appData, ticket);

    expect(documentHtml).toContain('Dto.: 10 %');
    expect(documentHtml).toContain('REGALO');

    expect(documentHtml).toContain('I.V.A. incluido');
    expect(documentHtml).toContain('21 %');
  });

  it('incorpora el QR histórico de la venta', (): void => {
    const documentHtml: string = buildVentaTicketDocument(appData, ticket);

    expect(documentHtml).toContain('data-qr-content="-123"');
    expect(documentHtml).toContain('<svg');
  });

  it('escapa todo texto dinámico', (): void => {
    const documentHtml: string = buildVentaTicketDocument(appData, ticket);

    expect(documentHtml).toContain('Artículo &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');

    expect(documentHtml).not.toContain('<script>alert("x")</script>');
  });

  it('identifica una operación netamente negativa como devolución', (): void => {
    const devolucion: VentaTicketInterface = {
      ...ticket,
      totalCents: -2_000,
      pagos: [
        {
          nombre: 'Efectivo',
          importeCents: -2_000,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
    };

    const documentHtml: string = buildVentaTicketDocument(appData, devolucion);

    expect(documentHtml).toContain('DEVOLUCIÓN');
  });

  it('representa correctamente una operación de total cero', (): void => {
    const ventaCero: VentaTicketInterface = {
      ...ticket,
      totalCents: 0,
      pagos: [],
    };

    const documentHtml: string = buildVentaTicketDocument(appData, ventaCero);

    expect(documentHtml).toContain('Sin movimientos de pago');
  });
});
