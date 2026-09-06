import type {
  ClienteFacturaDocumentoImpuestoInterface,
  ClienteFacturaDocumentoInterface,
  ClienteFacturaDocumentoVentaInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import BUSINESS_LOGO_URL from '@desktop-contracts/documents/business-logo-url.constant';

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

export default class ClienteFacturaPdfHtmlBuilder {
  /**
   * Construye el HTML A4 definitivo de una factura
   * sin incluir nunca las líneas de artículos.
   */
  build(documento: ClienteFacturaDocumentoInterface): string {
    if (
      documento.previsualizacion ||
      documento.estado === 'borrador' ||
      documento.numero === null
    ) {
      throw new Error('Solo se puede generar el PDF de una factura finalizada.');
    }

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src osumi: data:; style-src 'unsafe-inline';"
>
<style>
${this.getStyles()}
</style>
</head>
<body>
<header class="header">
  <section class="business">
    <img
      class="logo"
      src="${BUSINESS_LOGO_URL}"
      alt=""
    >
    <strong>${this.escapeHtml(documento.emisor.nombreComercial)}</strong>
    ${this.optionalLine(documento.emisor.cif)}
    ${this.optionalLine(documento.emisor.direccion)}
    ${this.optionalLine(
      this.joinValues([documento.emisor.telefono, documento.emisor.email], ' - '),
    )}
  </section>

  <section class="recipient">
    <dl class="meta">
      <dt>FECHA:</dt>
      <dd>${this.escapeHtml(this.formatDate(documento.fechaDocumento))}</dd>
      <dt>FACTURA:</dt>
      <dd>${this.escapeHtml(documento.numeroFactura)}</dd>
    </dl>

    <div class="recipient-data">
      <strong>${this.escapeHtml(documento.cliente.nombreApellidos)}</strong>
      ${this.optionalStrong(documento.cliente.dniCif)}
      ${this.optionalLine(documento.cliente.direccion)}
      ${this.optionalLine(
        this.joinNullableValues([documento.cliente.codigoPostal, documento.cliente.poblacion], ' '),
      )}
    </div>
  </section>
</header>

<table class="invoice-table">
  <thead>
    <tr>
      <th class="concept">CONCEPTO</th>
      <th>PVP</th>
      <th>BASE UD</th>
      <th>UD</th>
      <th>SUBTOTAL</th>
      <th colspan="2">IVA</th>
      <th>DTO</th>
      <th>TOTAL</th>
    </tr>
  </thead>
  <tbody>
    ${documento.ventas
      .map((venta: ClienteFacturaDocumentoVentaInterface): string => this.buildVentaRow(venta))
      .join('')}
  </tbody>
</table>

<section class="summary">
  <div class="paid">
    PAGADO
  </div>

  <div class="totals">
    ${this.buildTotalRow('SUBTOTAL', documento.subtotalCents)}

    ${documento.impuestos
      .map((impuesto: ClienteFacturaDocumentoImpuestoInterface): string =>
        this.buildTotalRow(`IVA ${this.formatPercentage(impuesto.ivaBps)}`, impuesto.cuotaCents),
      )
      .join('')}

    ${this.buildTotalRow('DESCUENTO', documento.descuentoCents)}

    ${this.buildTotalRow('TOTAL', documento.totalCents, true)}
  </div>
</section>
</body>
</html>`;
  }

  /**
   * Construye la fila resumen de una venta.
   */
  private buildVentaRow(venta: ClienteFacturaDocumentoVentaInterface): string {
    const referencia: string = `${venta.serie}${venta.numero}`;
    const concepto: string = `Ticket Nº ${referencia} (${this.formatDateTime(venta.fecha)})`;

    return `<tr>
<td class="concept">${this.escapeHtml(concepto)}</td>
<td class="money">${this.escapeHtml(this.formatCents(venta.pvpCents))}</td>
<td class="money">${this.escapeHtml(this.formatCents(venta.baseCents))}</td>
<td></td>
<td class="money">${this.escapeHtml(this.formatCents(venta.subtotalCents))}</td>
<td></td>
<td class="money">${this.escapeHtml(this.formatCents(venta.ivaCents))}</td>
<td class="money">${this.escapeHtml(this.formatCents(venta.descuentoCents))}</td>
<td class="money">${this.escapeHtml(this.formatCents(venta.totalCents))}</td>
</tr>`;
  }

  /**
   * Construye una fila del resumen monetario.
   */
  private buildTotalRow(label: string, cents: number, total: boolean = false): string {
    return `<div class="total-row${total ? ' total-row--final' : ''}">
<span>${this.escapeHtml(label)}</span>
<strong>${this.escapeHtml(this.formatCents(cents))}</strong>
</div>`;
  }

  /**
   * Inserta una línea únicamente cuando tiene valor.
   */
  private optionalLine(value: string | null): string {
    const normalizedValue: string | null = this.normalizeOptionalValue(value);

    return normalizedValue === null ? '' : `<span>${this.escapeHtml(normalizedValue)}</span>`;
  }

  /**
   * Inserta un dato destacado únicamente cuando existe.
   */
  private optionalStrong(value: string | null): string {
    const normalizedValue: string | null = this.normalizeOptionalValue(value);

    return normalizedValue === null ? '' : `<strong>${this.escapeHtml(normalizedValue)}</strong>`;
  }

  /**
   * Une valores obligatorios ignorando cadenas vacías.
   */
  private joinValues(values: readonly string[], separator: string): string {
    return values
      .map((value: string): string => value.trim())
      .filter((value: string): boolean => value.length > 0)
      .join(separator);
  }

  /**
   * Une valores opcionales ignorando ausencias.
   */
  private joinNullableValues(values: readonly (string | null)[], separator: string): string {
    return values
      .filter((value: string | null): value is string => value !== null)
      .map((value: string): string => value.trim())
      .filter((value: string): boolean => value.length > 0)
      .join(separator);
  }

  /**
   * Normaliza un valor textual opcional.
   */
  private normalizeOptionalValue(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalizedValue: string = value.trim();

    return normalizedValue.length === 0 ? null : normalizedValue;
  }

  /**
   * Formatea un importe monetario.
   */
  private formatCents(cents: number): string {
    return currencyFormatter.format(cents / 100).replaceAll('\u00a0', ' ');
  }

  /**
   * Formatea un IVA almacenado en basis points.
   */
  private formatPercentage(bps: number): string {
    return `${percentageFormatter.format(bps / 100)} %`;
  }

  /**
   * Formatea una fecha sin hora.
   */
  private formatDate(value: string): string {
    const date: Date | null = this.parseDate(value);

    if (date === null) {
      return value;
    }

    return [this.pad2(date.getDate()), this.pad2(date.getMonth() + 1), date.getFullYear()].join(
      '/',
    );
  }

  /**
   * Formatea una fecha con hora y minutos.
   */
  private formatDateTime(value: string): string {
    const date: Date | null = this.parseDate(value);

    if (date === null) {
      return value;
    }

    return `${this.formatDate(value)} ${this.pad2(
      date.getHours(),
    )}:${this.pad2(date.getMinutes())}`;
  }

  /**
   * Convierte fechas ISO o legacy SQLite.
   */
  private parseDate(value: string): Date | null {
    const normalizedValue: string = value.includes('T') ? value : value.replace(' ', 'T');
    const date: Date = new Date(normalizedValue);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Formatea un número con dos cifras.
   */
  private pad2(value: number): string {
    return String(value).padStart(2, '0');
  }

  /**
   * Escapa todo dato persistido antes de insertarlo
   * dentro del documento HTML.
   */
  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  /**
   * Devuelve los estilos del documento A4.
   */
  private getStyles(): string {
    return `
@page {
  size: A4 portrait;
  margin: 10mm;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  color: #111;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8pt;
}

.header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(60mm, 0.8fr);
  gap: 10mm;
  margin-bottom: 8mm;
}

.business,
.recipient-data {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.logo {
  width: 55mm;
  max-height: 20mm;
  margin-bottom: 4mm;
  object-fit: contain;
  object-position: left center;
}

.recipient {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 7mm;
  text-align: right;
}

.meta {
  display: grid;
  grid-template-columns: auto auto;
  gap: 1mm 7mm;
  margin: 0;
}

.meta dt {
  font-weight: 700;
}

.meta dd {
  min-width: 30mm;
  margin: 0;
  text-align: right;
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.invoice-table thead {
  display: table-header-group;
}

.invoice-table tr {
  break-inside: avoid;
}

.invoice-table th,
.invoice-table td {
  padding: 1.4mm 1mm;
  border-right: 0.25mm solid #111;
  overflow: hidden;
}

.invoice-table th:first-child,
.invoice-table td:first-child {
  border-left: 0.25mm solid #111;
}

.invoice-table thead {
  border-top: 0.25mm solid #111;
  border-bottom: 0.25mm solid #111;
}

.invoice-table tbody {
  border-bottom: 0.25mm solid #111;
}

.invoice-table th {
  text-align: center;
}

.invoice-table .concept {
  width: 34%;
  text-align: left;
}

.invoice-table th:nth-child(4),
.invoice-table td:nth-child(4) {
  width: 5%;
  text-align: center;
}

.invoice-table th:not(.concept),
.invoice-table td:not(.concept) {
  white-space: nowrap;
}

.money {
  text-align: right;
  white-space: nowrap;
}

.summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 65mm;
  gap: 10mm;
  align-items: end;
  margin-top: 8mm;
  break-inside: avoid;
}

.paid {
  width: 80%;
  margin: 0 auto;
  padding: 6mm;
  border-top: 0.5mm solid #111;
  border-bottom: 0.5mm solid #111;
  color: #555;
  font-size: 18pt;
  text-align: center;
}

.totals {
  border: 0.25mm solid #111;
}

.total-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
}

.total-row span,
.total-row strong {
  padding: 1.5mm 2mm;
}

.total-row span {
  text-align: right;
}

.total-row strong {
  background: #eee;
  text-align: right;
  white-space: nowrap;
}

.total-row--final {
  border-top: 0.25mm solid #111;
  font-size: 12pt;
}

.total-row--final span {
  font-weight: 700;
}
`;
  }
}
