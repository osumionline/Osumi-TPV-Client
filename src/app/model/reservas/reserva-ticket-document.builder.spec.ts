import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import buildReservaTicketDocument from '@model/reservas/reserva-ticket-document.builder';

describe('buildReservaTicketDocument', (): void => {
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
    emailSmtp: null,
    ticketBai: null,
    fechaCad: false,
    empleados: false,
  };

  const reserva: ReservaInterface = {
    id: 42,
    publicId: 'reserva-public-id',
    idCliente: 7,
    clientePublicId: 'cliente-public-id',
    clienteNombre: 'Cliente <Prueba>',
    totalMicros: 25_500_000,
    fecha: '2026-08-20T12:15:00',
    lineas: [
      {
        id: 1,
        publicId: 'linea-public-id',
        idArticulo: 10,
        articuloPublicId: 'articulo-public-id',
        localizador: 100,
        marca: 'Marca & Cía',
        nombre: 'Camiseta <script>alert("x")</script>',
        pucMicros: 5_000_000,
        pvpMicros: 12_750_000,
        ivaBps: 2_100,
        importeMicros: 25_500_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 2,
      },
    ],
  };

  it('incluye los datos principales de la reserva', (): void => {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    expect(documentHtml).toContain('RESERVA');

    expect(documentHtml).toContain('Reserva nº 42');

    expect(documentHtml).toContain('20/08/2026 12:15');

    expect(documentHtml).toContain('25,50');

    expect(documentHtml).toContain('PENDIENTE DE PAGO');
  });

  it('escapa los datos dinámicos del cliente y de las líneas', (): void => {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    expect(documentHtml).toContain('Cliente &lt;Prueba&gt;');

    expect(documentHtml).toContain('Marca &amp; Cía');

    expect(documentHtml).toContain('Camiseta &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');

    expect(documentHtml).not.toContain('<script>alert("x")</script>');
  });

  it('identifica el documento como reserva y no como venta', (): void => {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    expect(documentHtml).toContain('No constituye un ticket o factura de venta.');
  });

  it('mantiene la cabecera sencilla y prioriza el nombre comercial', (): void => {
    const documentHtml: string = buildReservaTicketDocument(appData, reserva);

    expect(documentHtml).toMatch(/<div class="business__name">\s*Mi comercio\s*<\/div>/);

    expect(documentHtml).not.toContain('src="osumi://assets/logo"');

    expect(documentHtml).not.toContain('class="social"');
  });
});
