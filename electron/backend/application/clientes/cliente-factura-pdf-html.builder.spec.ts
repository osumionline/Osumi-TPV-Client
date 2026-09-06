import ClienteFacturaPdfHtmlBuilder from '@backend/application/clientes/cliente-factura-pdf-html.builder';
import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import { describe, expect, it } from 'vitest';

describe('ClienteFacturaPdfHtmlBuilder', (): void => {
  it('construye el PDF final con ventas, PAGADO y sin líneas', (): void => {
    const builder = new ClienteFacturaPdfHtmlBuilder();
    const documento: ClienteFacturaDocumentoInterface = createDocumento();

    const html: string = builder.build(documento);

    expect(html).toContain('osumi://assets/logo');
    expect(html).toContain('Mi tienda');
    expect(html).toContain('FACTURA:');
    expect(html).toContain('21_2026');
    expect(html).toContain('Ticket Nº 101 (05/09/2026');
    expect(html).toContain('PAGADO');
    expect(html).not.toContain('PREVISUALIZACIÓN');

    /*
     * La línea existe en el modelo para la preview,
     * pero nunca debe incorporarse al PDF definitivo.
     */
    expect(html).not.toContain('Artículo que no debe imprimirse');
  });

  it('escapa los datos persistidos antes de construir el HTML', (): void => {
    const builder = new ClienteFacturaPdfHtmlBuilder();
    const documento: ClienteFacturaDocumentoInterface = {
      ...createDocumento(),
      emisor: {
        ...createDocumento().emisor,
        nombreComercial: '<Tienda & Co>',
      },
      cliente: {
        ...createDocumento().cliente,
        nombreApellidos: '<script>alert("x")</script>',
      },
    };

    const html: string = builder.build(documento);

    expect(html).toContain('&lt;Tienda &amp; Co&gt;');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("x")</script>');
    expect(html).toContain('size: A4 portrait;');
    expect(html).not.toContain('size: A4 landscape;');
  });

  it('rechaza generar un PDF definitivo desde un borrador', (): void => {
    const builder = new ClienteFacturaPdfHtmlBuilder();
    const documento: ClienteFacturaDocumentoInterface = {
      ...createDocumento(),
      numero: null,
      numeroFactura: '_2026',
      estado: 'borrador',
      previsualizacion: true,
      fechaEmision: null,
    };

    expect((): string => builder.build(documento)).toThrow(
      'Solo se puede generar el PDF de una factura finalizada.',
    );
  });
});

/**
 * Crea un documento finalizado representativo.
 */
function createDocumento(): ClienteFacturaDocumentoInterface {
  return {
    facturaPublicId: 'factura-1',
    serie: '',
    numero: 21,
    year: 2026,
    numeroFactura: '21_2026',
    estado: 'emitida',
    previsualizacion: false,
    generatedAt: '2026-09-06T10:00:00.000Z',
    fechaDocumento: '2026-09-06T10:00:00.000Z',
    fechaCreacion: '2026-09-05T09:00:00.000Z',
    fechaEmision: '2026-09-06T10:00:00.000Z',
    fechaAnulacion: null,
    emisor: {
      nombre: 'Empresa fiscal',
      nombreComercial: 'Mi tienda',
      cif: 'B12345678',
      telefono: '944000000',
      direccion: 'Gran Vía 1',
      poblacion: 'Bilbao',
      email: 'tienda@example.com',
      web: 'https://example.com',
    },
    cliente: {
      nombreApellidos: 'Cliente',
      dniCif: '12345678Z',
      telefono: null,
      email: null,
      direccion: 'Calle Cliente 1',
      codigoPostal: '48001',
      poblacion: 'Bilbao',
      provinciaId: 48,
    },
    ventas: [
      {
        publicId: 'venta-1',
        serie: '',
        numero: 101,
        fecha: '2026-09-05T10:00:00.000Z',
        pvpCents: 1_210,
        baseCents: 1_000,
        subtotalCents: 1_000,
        ivaCents: 210,
        descuentoCents: 0,
        totalCents: 1_210,
        lineas: [
          {
            localizador: 1001,
            marca: 'Marca',
            nombre: 'Artículo que no debe imprimirse',
            pvpCents: 1_210,
            baseUnitCents: 1_000,
            unidades: 1,
            subtotalCents: 1_000,
            ivaBps: 2_100,
            ivaCents: 210,
            descuentoCents: 0,
            totalCents: 1_210,
            regalo: false,
          },
        ],
      },
    ],
    impuestos: [
      {
        ivaBps: 2_100,
        baseCents: 1_000,
        cuotaCents: 210,
        totalCents: 1_210,
      },
    ],
    subtotalCents: 1_000,
    descuentoCents: 0,
    totalCents: 1_210,
  };
}
