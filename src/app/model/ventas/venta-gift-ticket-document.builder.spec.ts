import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import buildVentaGiftTicketDocument from '@model/ventas/venta-gift-ticket-document.builder';

describe('buildVentaGiftTicketDocument', (): void => {
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
    twitter: '@empresa',
    facebook: '',
    instagram: 'empresa_instagram',
    web: '',
    frasesTicket: ['Gracias por su compra.'],
    tipoIva: 'iva',
    ivaList: [21, 10, 4],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    fechaCad: false,
    empleados: false,
  };

  it('incluye la información no económica del ticket regalo', (): void => {
    const documentHtml: string = buildVentaGiftTicketDocument(appData, createTicket());

    expect(documentHtml).toContain('TICKET REGALO');

    expect(documentHtml).toContain('F. simplificada A-456');

    expect(documentHtml).toContain('Empleado &amp; Prueba');

    expect(documentHtml).toContain('Artículo de prueba');

    expect(documentHtml).toContain('2 ×');

    expect(documentHtml).toContain('data-qr-content="-123"');

    expect(documentHtml).toContain('Gracias por su compra.');
  });

  it('oculta cliente y toda la información económica', (): void => {
    const documentHtml: string = buildVentaGiftTicketDocument(appData, createTicket());

    expect(documentHtml).not.toContain('Cliente de prueba');

    expect(documentHtml).not.toContain('TOTAL');
    expect(documentHtml).not.toContain('PAGOS');
    expect(documentHtml).not.toContain('I.V.A.');
    expect(documentHtml).not.toContain('Entregado');
    expect(documentHtml).not.toContain('Cambio');
    expect(documentHtml).not.toContain('Dto.:');
  });

  it('solo incluye las líneas positivas de una operación mixta', (): void => {
    const ticket: VentaTicketInterface = {
      ...createTicket(),
      lineas: [
        ...createTicket().lineas,
        {
          nombre: 'Artículo devuelto',
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

    const documentHtml: string = buildVentaGiftTicketDocument(appData, ticket);

    expect(documentHtml).toContain('Artículo de prueba');

    expect(documentHtml).not.toContain('Artículo devuelto');
  });

  it('rechaza una devolución pura', (): void => {
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

    expect((): string => buildVentaGiftTicketDocument(appData, ticket)).toThrow(
      'No se puede generar un ticket regalo para una operación sin líneas de compra.',
    );
  });

  it('escapa los textos dinámicos', (): void => {
    const ticket: VentaTicketInterface = {
      ...createTicket(),
      empleadoNombre: '<script>empleado</script>',
      lineas: [
        {
          ...createTicket().lineas[0]!,
          nombre: '<strong>Artículo</strong>',
        },
      ],
    };

    const documentHtml: string = buildVentaGiftTicketDocument(appData, ticket);

    expect(documentHtml).toContain('&lt;script&gt;empleado&lt;/script&gt;');

    expect(documentHtml).toContain('&lt;strong&gt;Artículo&lt;/strong&gt;');

    expect(documentHtml).not.toContain('<script>empleado</script>');
  });
});

/**
 * Construye el snapshot de venta utilizado por los tests.
 */
function createTicket(): VentaTicketInterface {
  return {
    id: 123,
    publicId: 'venta-public-id',
    serie: 'A',
    numero: 456,
    fecha: '2026-08-21T16:30:00.000Z',
    empleadoNombre: 'Empleado & Prueba',
    clienteNombre: 'Cliente de prueba',
    totalCents: 2_000,
    ticketRevision: 3,
    ticketPdfRevision: 3,
    pagos: [
      {
        nombre: 'Efectivo',
        importeCents: 2_000,
        entregadoCents: 2_000,
        cambioCents: 0,
      },
    ],
    lineas: [
      {
        nombre: 'Artículo de prueba',
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 18_000_000,
        descuentoBps: 1_000,
        importeDescuentoMicros: 0,
        unidades: 2,
        regalo: false,
      },
    ],
  };
}
