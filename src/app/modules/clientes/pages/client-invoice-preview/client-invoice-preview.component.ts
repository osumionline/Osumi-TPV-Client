import {
  Component,
  computed,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type {
  ClienteFacturaDocumentoInterface,
  ClienteFacturaDocumentoVentaInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import BUSINESS_LOGO_URL from '@model/documents/business-logo-url.constant';
import { getErrorMessage } from '@utils/error.utils';

const currencyFormatter: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentageFormatter: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Renderer interactivo utilizado exclusivamente por
 * la ventana Electron de previsualización de factura.
 */
@Component({
  selector: 'otpv-root',
  templateUrl: './client-invoice-preview.component.html',
  styleUrl: './client-invoice-preview.component.scss',
  imports: [MatIcon],
})
export default class ClientInvoicePreviewComponent implements OnInit {
  readonly logoUrl: string = BUSINESS_LOGO_URL;
  readonly documento: WritableSignal<ClienteFacturaDocumentoInterface | null> =
    signal<ClienteFacturaDocumentoInterface | null>(null);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly processing: WritableSignal<boolean> = signal<boolean>(false);
  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);
  readonly expandedVentas: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  readonly canEmit: Signal<boolean> = computed((): boolean => {
    const documento: ClienteFacturaDocumentoInterface | null = this.documento();

    return (
      documento !== null &&
      documento.previsualizacion &&
      documento.estado === 'borrador' &&
      !this.loading() &&
      !this.processing()
    );
  });

  readonly allVentasExpanded: Signal<boolean> = computed((): boolean => {
    const documento: ClienteFacturaDocumentoInterface | null = this.documento();

    if (documento === null || documento.ventas.length === 0) {
      return false;
    }

    const expandedVentas: ReadonlySet<string> = this.expandedVentas();

    return documento.ventas.every((venta: ClienteFacturaDocumentoVentaInterface): boolean =>
      expandedVentas.has(venta.publicId),
    );
  });

  /**
   * Recupera el documento asociado por el preload
   * exclusivamente a esta BrowserWindow.
   */
  ngOnInit(): void {
    void this.loadDocumento();
  }

  /**
   * Reintenta la lectura documental.
   */
  retry(): void {
    if (this.processing()) {
      return;
    }

    void this.loadDocumento();
  }

  /**
   * Indica si una venta tiene sus líneas visibles.
   */
  isVentaExpanded(publicId: string): boolean {
    return this.expandedVentas().has(publicId);
  }

  /**
   * Alterna las líneas de una venta manteniendo
   * independientes las demás filas.
   */
  toggleVenta(publicId: string): void {
    if (this.processing()) {
      return;
    }

    const expandedVentas: Set<string> = new Set<string>(this.expandedVentas());

    if (expandedVentas.has(publicId)) {
      expandedVentas.delete(publicId);
    } else {
      expandedVentas.add(publicId);
    }

    this.expandedVentas.set(expandedVentas);
  }

  /**
   * Despliega todas las ventas o las contrae cuando
   * ya se encuentran todas abiertas.
   */
  toggleAllVentas(): void {
    if (this.processing()) {
      return;
    }

    const documento: ClienteFacturaDocumentoInterface | null = this.documento();

    if (documento === null) {
      return;
    }

    if (this.allVentasExpanded()) {
      this.expandedVentas.set(new Set<string>());

      return;
    }

    this.expandedVentas.set(
      new Set<string>(
        documento.ventas.map(
          (venta: ClienteFacturaDocumentoVentaInterface): string => venta.publicId,
        ),
      ),
    );
  }

  /**
   * Solicita confirmación antes de consumir la
   * numeración definitiva de la factura.
   */
  async emitFactura(): Promise<void> {
    if (!this.canEmit()) {
      return;
    }

    const confirmed: boolean = window.confirm(
      'Al facturar se asignará un número definitivo y la factura dejará de poder editarse. ¿Quieres continuar?',
    );

    if (!confirmed) {
      return;
    }

    this.processing.set(true);
    this.operationError.set(null);

    try {
      const documento: ClienteFacturaDocumentoInterface =
        await window.osumiFacturaPreview.emitFactura();

      this.documento.set(documento);
      this.expandedVentas.set(new Set<string>());
    } catch (error: unknown) {
      this.operationError.set(getErrorMessage(error, 'No se ha podido emitir la factura.'));
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Devuelve la referencia histórica visible de
   * una venta incluida en la factura.
   */
  getVentaReferencia(venta: ClienteFacturaDocumentoVentaInterface): string {
    return `${venta.serie}${venta.numero}`;
  }

  /**
   * Formatea un importe en céntimos.
   */
  formatCents(cents: number): string {
    if (cents === 0) {
      return '0 €';
    }

    return currencyFormatter.format(cents / 100);
  }

  /**
   * Formatea un IVA expresado en basis points.
   */
  formatPercentage(bps: number): string {
    return `${percentageFormatter.format(bps / 100)} %`;
  }

  /**
   * Formatea una fecha sin hora.
   */
  formatDate(value: string): string {
    const date: Date | null = this.parseDate(value);

    if (date === null) {
      return value;
    }

    return [this.pad2(date.getDate()), this.pad2(date.getMonth() + 1), date.getFullYear()].join(
      '/',
    );
  }

  /**
   * Formatea una fecha incluyendo horas y minutos.
   */
  formatDateTime(value: string): string {
    const date: Date | null = this.parseDate(value);

    if (date === null) {
      return value;
    }

    return `${this.formatDate(value)} ${this.pad2(date.getHours())}:${this.pad2(
      date.getMinutes(),
    )}`;
  }

  /**
   * Une teléfono y email del establecimiento
   * únicamente cuando están disponibles.
   */
  getBusinessContact(documento: ClienteFacturaDocumentoInterface): string {
    return [documento.emisor.telefono, documento.emisor.email]
      .map((value: string): string => value.trim())
      .filter((value: string): boolean => value !== '')
      .join(' - ');
  }

  /**
   * Construye la localidad postal del cliente.
   */
  getClienteLocalidad(documento: ClienteFacturaDocumentoInterface): string {
    return [documento.cliente.codigoPostal, documento.cliente.poblacion]
      .filter((value: string | null): value is string => value !== null)
      .map((value: string): string => value.trim())
      .filter((value: string): boolean => value !== '')
      .join(' ');
  }

  /**
   * Recupera el documento manteniendo todas las
   * ventas inicialmente contraídas.
   */
  private async loadDocumento(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.operationError.set(null);
    this.expandedVentas.set(new Set<string>());

    try {
      const documento: ClienteFacturaDocumentoInterface =
        await window.osumiFacturaPreview.getDocumento();

      this.documento.set(documento);
    } catch (error: unknown) {
      this.documento.set(null);
      this.loadError.set(
        getErrorMessage(error, 'No se ha podido recuperar la previsualización de la factura.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Convierte fechas ISO y fechas legacy SQLite
   * a un Date válido para representación local.
   */
  private parseDate(value: string): Date | null {
    const normalizedValue: string = value.includes('T') ? value : value.replace(' ', 'T');
    const date: Date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Formatea un componente de fecha con dos cifras.
   */
  private pad2(value: number): string {
    return String(value).padStart(2, '0');
  }
}
