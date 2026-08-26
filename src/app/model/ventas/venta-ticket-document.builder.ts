import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
  VentaTicketPagoInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';
import {
  formatTicketCents,
  formatTicketDateTime,
  formatTicketMicros,
  formatTicketPercentage,
  renderTicketBusinessHeader,
  renderTicketPhrases,
  resolveFiscalTicketBusinessName,
} from '@model/tickets/ticket-document-shared.utils';
import {
  buildVentaTicketIvaResumen,
  type VentaTicketIvaResumen,
} from '@model/ventas/venta-ticket-iva.utils';
import {
  buildVentaTicketQrContent,
  buildVentaTicketQrSvg,
} from '@model/ventas/venta-ticket-qr.utils';
import { escapeHtml } from '@utils/html.utils';
import { trimToNull } from '@utils/string.utils';

/**
 * Construye el documento definitivo de una venta a partir
 * del snapshot que ha sido releído desde SQLite después del COMMIT.
 *
 * No recibe VentaEnCurso ni ningún otro modelo mutable de la operación.
 */
export default function buildVentaTicketDocument(
  appData: AppData,
  ticket: VentaTicketInterface,
): string {
  const businessName: string = resolveFiscalTicketBusinessName(appData);

  const ticketReference: string = formatTicketReference(ticket);
  const operationTitle: string = ticket.totalCents < 0 ? 'DEVOLUCIÓN' : 'TICKET';

  const qrContent: string = buildVentaTicketQrContent(ticket.id);
  const qrSvg: string = buildVentaTicketQrSvg(ticket.id);

  const ivaResumen: readonly VentaTicketIvaResumen[] = buildVentaTicketIvaResumen(ticket.lineas);

  const documentTitle: string = `${operationTitle} ${ticketReference} - ${businessName}`;

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">

  <title>
    ${escapeHtml(documentTitle)}
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 80mm;
      margin: 0;
      color: #111;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }

    .ticket {
      width: 80mm;
      padding: 4mm;
      font-size: 9pt;
      line-height: 1.3;
    }

    .business {
      margin-bottom: 3mm;
      text-align: center;
    }

    .business__logo {
      display: block;
      width: auto;
      height: auto;
      max-width: 58mm;
      max-height: 22mm;
      margin: 0 auto 2.5mm;
      object-fit: contain;
    }

    .business__name {
      margin: 0 0 1.5mm;
      font-size: 14pt;
      font-weight: 700;
    }

    .business__line {
      margin: .5mm 0;
    }

    .social {
      display: flex;
      margin-top: 2.5mm;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1.5mm 4mm;
    }

    .social__item {
      display: flex;
      max-width: 100%;
      align-items: center;
      gap: 1.5mm;
      font-size: 8pt;
    }

    .social__icon {
      display: block;
      width: 4mm;
      height: 4mm;
      flex: 0 0 4mm;
      object-fit: contain;
    }

    .social__value {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .ticket__title {
      margin: 3mm 0 1.5mm;
      padding: 2mm 0;
      border-top: 1px dashed #555;
      border-bottom: 1px dashed #555;
      font-size: 15pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: .08em;
    }

    .ticket__reference {
      margin-bottom: 3mm;
      text-align: center;
    }

    .data {
      margin-bottom: 3mm;
    }

    .data__row,
    .payment__row {
      display: flex;
      margin-bottom: 1mm;
      gap: 2mm;
    }

    .data__label,
    .payment__label {
      flex: 0 0 auto;
      font-weight: 700;
    }

    .data__value,
    .payment__value {
      min-width: 0;
      flex: 1;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .lines {
      border-top: 1px dashed #555;
    }

    .line {
      padding: 2.5mm 0;
      border-bottom: 1px dashed #aaa;
      break-inside: avoid;
    }

    .line__description {
      display: flex;
      gap: 2mm;
    }

    .line__units {
      flex: 0 0 auto;
      font-weight: 700;
    }

    .line__name {
      min-width: 0;
      flex: 1;
      overflow-wrap: anywhere;
    }

    .line__amounts {
      display: flex;
      margin-top: 1.5mm;
      justify-content: space-between;
      gap: 3mm;
    }

    .line__unit-price {
      color: #555;
      font-size: 8pt;
    }

    .line__total {
      font-weight: 700;
      white-space: nowrap;
    }

    .line__discount {
      margin-top: 1mm;
      color: #444;
      font-size: 8pt;
      font-style: italic;
    }

    .line__gift {
      font-weight: 700;
      font-style: normal;
    }

    .total {
      display: flex;
      margin-top: 3mm;
      padding-top: 3mm;
      justify-content: space-between;
      gap: 4mm;
      border-top: 2px solid #111;
      font-size: 14pt;
      font-weight: 700;
    }

    .section {
      margin-top: 4mm;
      padding-top: 3mm;
      border-top: 1px dashed #555;
    }

    .section__title {
      margin: 0 0 2mm;
      font-size: 9pt;
      font-weight: 700;
      text-align: center;
      letter-spacing: .06em;
    }

    .payment__detail {
      padding-left: 4mm;
      color: #444;
      font-size: 8pt;
    }

    .payment__empty {
      color: #555;
      font-size: 8pt;
      text-align: center;
    }

    .iva__included {
      margin-bottom: 2mm;
      text-align: center;
      font-size: 8pt;
    }

    .iva {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }

    .iva th,
    .iva td {
      padding: 1mm .5mm;
      text-align: right;
    }

    .iva th:first-child,
    .iva td:first-child {
      text-align: left;
    }

    .iva th {
      border-bottom: 1px solid #999;
      font-weight: 700;
    }

    .iva__empty {
      color: #555;
      font-size: 8pt;
      text-align: center;
    }

    .qr {
      width: 30mm;
      margin: 4mm auto 0;
      text-align: center;
    }

    .qr svg {
      display: block;
      width: 30mm;
      height: 30mm;
    }

    .footer {
      margin-top: 4mm;
      font-size: 8pt;
      text-align: center;
    }

    .footer__phrase {
      margin: .8mm 0;
      overflow-wrap: anywhere;
    }

    @page {
      margin: 0;
    }

    @media print {
      html,
      body,
      .ticket {
        width: 80mm;
      }
    }
  </style>
</head>
<body>
  <main class="ticket">
    ${renderTicketBusinessHeader(appData, businessName, 'branded')}

    <div class="ticket__title">
      ${operationTitle}
    </div>

    <div class="ticket__reference">
      F. simplificada ${escapeHtml(ticketReference)}
    </div>

    <section class="data">
      <div class="data__row">
        <span class="data__label">
          Fecha
        </span>

        <span class="data__value">
          ${escapeHtml(formatTicketDateTime(ticket.fecha))}
        </span>
      </div>

      <div class="data__row">
        <span class="data__label">
          Le atendió
        </span>

        <span class="data__value">
          ${escapeHtml(ticket.empleadoNombre)}
        </span>
      </div>

      ${
        ticket.clienteNombre === null
          ? ''
          : `
            <div class="data__row">
              <span class="data__label">
                Cliente
              </span>

              <span class="data__value">
                ${escapeHtml(ticket.clienteNombre)}
              </span>
            </div>
          `
      }
    </section>

    <section class="lines">
      ${ticket.lineas
        .map((linea: VentaTicketLineaInterface): string => renderLinea(linea))
        .join('')}
    </section>

    <div class="total">
      <span>
        TOTAL
      </span>

      <span>
        ${escapeHtml(formatTicketCents(ticket.totalCents))}
      </span>
    </div>

    ${renderPagos(ticket.pagos)}

    ${renderIva(ivaResumen)}

    <div
      class="qr"
      data-qr-content="${escapeHtml(qrContent)}"
      aria-label="Código QR del ticket"
    >
      ${qrSvg}
    </div>

    ${renderTicketPhrases(appData.frasesTicket)}
  </main>
</body>
</html>
  `.trim();
}

function renderLinea(linea: VentaTicketLineaInterface): string {
  return `
    <article class="line">
      <div class="line__description">
        <span class="line__units">
          ${linea.unidades} ×
        </span>

        <span class="line__name">
          ${escapeHtml(linea.nombre)}
        </span>
      </div>

      <div class="line__amounts">
        <span class="line__unit-price">
          ${escapeHtml(formatTicketMicros(linea.pvpMicros))} / ud.
        </span>

        <span class="line__total">
          ${escapeHtml(formatTicketMicros(linea.importeMicros))}
        </span>
      </div>

      ${renderLineaDescuento(linea)}
    </article>
  `;
}

function renderLineaDescuento(linea: VentaTicketLineaInterface): string {
  if (linea.regalo) {
    return `
      <div class="line__discount line__gift">
        REGALO
      </div>
    `;
  }

  const discountParts: string[] = [];

  if (linea.descuentoBps > 0) {
    discountParts.push(formatTicketPercentage(linea.descuentoBps));
  }

  if (linea.importeDescuentoMicros !== 0) {
    discountParts.push(formatTicketMicros(Math.abs(linea.importeDescuentoMicros)));
  }

  if (discountParts.length === 0) {
    return '';
  }

  return `
    <div class="line__discount">
      Dto.: ${escapeHtml(discountParts.join(' · '))}
    </div>
  `;
}

function renderPagos(pagos: readonly VentaTicketPagoInterface[]): string {
  if (pagos.length === 0) {
    return `
      <section class="section">
        <div class="section__title">
          PAGOS
        </div>

        <div class="payment__empty">
          Sin movimientos de pago
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="section__title">
        PAGOS
      </div>

      ${pagos.map((pago: VentaTicketPagoInterface): string => renderPago(pago)).join('')}
    </section>
  `;
}

function renderPago(pago: VentaTicketPagoInterface): string {
  return `
    <div class="payment">
      <div class="payment__row">
        <span class="payment__label">
          ${escapeHtml(pago.nombre)}
        </span>

        <span class="payment__value">
          ${escapeHtml(formatTicketCents(pago.importeCents))}
        </span>
      </div>

      ${
        pago.entregadoCents === null
          ? ''
          : `
            <div class="payment__row payment__detail">
              <span>
                Entregado
              </span>

              <span class="payment__value">
                ${escapeHtml(formatTicketCents(pago.entregadoCents))}
              </span>
            </div>

            <div class="payment__row payment__detail">
              <span>
                Cambio
              </span>

              <span class="payment__value">
                ${escapeHtml(formatTicketCents(pago.cambioCents))}
              </span>
            </div>
          `
      }
    </div>
  `;
}

function renderIva(resumen: readonly VentaTicketIvaResumen[]): string {
  if (resumen.length === 0) {
    return `
      <section class="section">
        <div class="iva__included">
          I.V.A. incluido
        </div>

        <div class="iva__empty">
          Sin importe sujeto a desglose
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="iva__included">
        I.V.A. incluido
      </div>

      <table class="iva">
        <thead>
          <tr>
            <th>
              IVA
            </th>

            <th>
              Base
            </th>

            <th>
              Cuota
            </th>
          </tr>
        </thead>

        <tbody>
          ${resumen
            .map(
              (iva: VentaTicketIvaResumen): string => `
                <tr>
                  <td>
                    ${escapeHtml(formatTicketPercentage(iva.ivaBps))}
                  </td>

                  <td>
                    ${escapeHtml(formatTicketMicros(iva.baseMicros))}
                  </td>

                  <td>
                    ${escapeHtml(formatTicketMicros(iva.cuotaMicros))}
                  </td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;
}

function formatTicketReference(ticket: VentaTicketInterface): string {
  const serie: string | null = trimToNull(ticket.serie);

  return serie === null ? String(ticket.numero) : `${serie}-${ticket.numero}`;
}
