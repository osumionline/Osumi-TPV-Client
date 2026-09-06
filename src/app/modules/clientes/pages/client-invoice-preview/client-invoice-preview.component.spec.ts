import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type ClienteFacturaPreviewApi from '@desktop-contracts/clientes/cliente-factura-preview-api.interface';
import ClientInvoicePreviewComponent from '@modules/clientes/pages/client-invoice-preview/client-invoice-preview.component';
import { vi } from 'vitest';

describe('ClientInvoicePreviewComponent', (): void => {
  let fixture: ComponentFixture<ClientInvoicePreviewComponent>;
  let originalPreviewDescriptor: PropertyDescriptor | undefined;
  let documento: ClienteFacturaDocumentoInterface;
  let emittedDocumento: ClienteFacturaDocumentoInterface;

  beforeEach(async (): Promise<void> => {
    originalPreviewDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiFacturaPreview');
    documento = createDocumento(true);
    emittedDocumento = createDocumento(false);

    const api: ClienteFacturaPreviewApi = {
      getDocumento: (): Promise<ClienteFacturaDocumentoInterface> => Promise.resolve(documento),

      emitFactura: (): Promise<ClienteFacturaDocumentoInterface> =>
        Promise.resolve(emittedDocumento),
    };

    Object.defineProperty(window, 'osumiFacturaPreview', {
      configurable: true,
      value: api,
    });

    await TestBed.configureTestingModule({
      imports: [ClientInvoicePreviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientInvoicePreviewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach((): void => {
    vi.restoreAllMocks();

    if (originalPreviewDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiFacturaPreview', originalPreviewDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiFacturaPreview');
  });

  it('carga todas las ventas inicialmente contraídas', (): void => {
    expect(fixture.componentInstance.documento()).toEqual(documento);
    expect(fixture.componentInstance.expandedVentas().size).toBe(0);
  });

  it('permite desplegar y volver a contraer una venta', (): void => {
    fixture.componentInstance.toggleVenta('venta-1');

    expect(fixture.componentInstance.isVentaExpanded('venta-1')).toBe(true);

    fixture.componentInstance.toggleVenta('venta-1');

    expect(fixture.componentInstance.isVentaExpanded('venta-1')).toBe(false);
  });

  it('permite desplegar y contraer todas las ventas de una vez', (): void => {
    expect(fixture.componentInstance.allVentasExpanded()).toBe(false);

    fixture.componentInstance.toggleAllVentas();

    expect(fixture.componentInstance.allVentasExpanded()).toBe(true);
    expect(fixture.componentInstance.expandedVentas()).toEqual(
      new Set<string>(documento.ventas.map((venta): string => venta.publicId)),
    );

    fixture.componentInstance.toggleAllVentas();

    expect(fixture.componentInstance.allVentasExpanded()).toBe(false);
    expect(fixture.componentInstance.expandedVentas().size).toBe(0);
  });

  it('factura desde la preview y pasa a la representación pagada', async (): Promise<void> => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.toggleVenta('venta-1');

    await fixture.componentInstance.emitFactura();

    expect(fixture.componentInstance.documento()).toEqual(emittedDocumento);
    expect(fixture.componentInstance.canEmit()).toBe(false);
    expect(fixture.componentInstance.expandedVentas().size).toBe(0);
  });
});

/**
 * Crea un documento mínimo válido para probar
 * ambos estados de la ventana.
 */
function createDocumento(previsualizacion: boolean): ClienteFacturaDocumentoInterface {
  return {
    facturaPublicId: 'factura-1',
    serie: '',
    numero: previsualizacion ? null : 21,
    year: 2026,
    numeroFactura: previsualizacion ? '_2026' : '21_2026',
    estado: previsualizacion ? 'borrador' : 'emitida',
    previsualizacion,
    generatedAt: '2026-09-06T10:00:00.000Z',
    fechaDocumento: '2026-09-06T10:00:00.000Z',
    fechaCreacion: '2026-09-05T10:00:00.000Z',
    fechaEmision: previsualizacion ? null : '2026-09-06T10:00:00.000Z',
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
            nombre: 'Artículo',
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
