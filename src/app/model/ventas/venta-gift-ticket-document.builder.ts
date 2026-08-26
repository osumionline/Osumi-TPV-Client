import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';
import {
  formatTicketDateTime,
  renderTicketBusinessHeader,
  renderTicketPhrases,
  resolveFiscalTicketBusinessName,
} from '@model/tickets/ticket-document-shared.utils';
import {
  buildVentaTicketQrContent,
  buildVentaTicketQrSvg,
} from '@model/ventas/venta-ticket-qr.utils';
import { escapeHtml } from '@utils/html.utils';
import { trimToNull } from '@utils/string.utils';

/**
 * Construye un ticket regalo efímero a partir del
 * snapshot persistido de una venta.
 *
 * Solo incluye líneas de compra positivas y omite
 * toda la información económica y del cliente.
 */
export default function buildVentaGiftTicketDocument(
  appData: AppData,
  ticket: VentaTicketInterface,
): string {
  const lineas: readonly VentaTicketLineaInterface[] = ticket.lineas.filter(
    (linea: VentaTicketLineaInterface): boolean => linea.unidades > 0,
  );

  if (lineas.length === 0) {
    throw new Error(
      'No se puede generar un ticket regalo para una operación sin líneas de compra.',
    );
  }

  const businessName: string = resolveFiscalTicketBusinessName(appData);

  const ticketReference: string = formatTicketReference(ticket);

  const qrContent: string = buildVentaTicketQrContent(ticket.id);

  const qrSvg: string = buildVentaTicketQrSvg(ticket.id);

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">

  <title>
    ${escapeHtml(`TICKET REGALO ${ticketReference} - ${businessName}`)}
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

    .data__row {
      display: flex;
      margin-bottom: 1mm;
      gap: 2mm;
    }

    .data__label {
      flex: 0 0 auto;
      font-weight: 700;
    }

    .data__value {
      min-width: 0;
      flex: 1;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .lines {
      border-top: 1px dashed #555;
    }

    .line {
      display: flex;
      padding: 3mm 0;
      gap: 2mm;
      border-bottom: 1px dashed #aaa;
      break-inside: avoid;
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
      TICKET REGALO
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
    </section>

    <section class="lines">
      ${lineas.map((linea: VentaTicketLineaInterface): string => renderLinea(linea)).join('')}
    </section>

    <div
      class="qr"
      data-qr-content="${escapeHtml(qrContent)}"
      aria-label="Código QR del ticket regalo"
    >
      ${qrSvg}
    </div>

    ${renderTicketPhrases(appData.frasesTicket)}
  </main>
</body>
</html>
  `.trim();
}

/**
 * Renderiza una línea del ticket regalo sin datos económicos.
 */
function renderLinea(linea: VentaTicketLineaInterface): string {
  return `
    <article class="line">
      <span class="line__units">
        ${linea.unidades} ×
      </span>

      <span class="line__name">
        ${escapeHtml(linea.nombre)}
      </span>
    </article>
  `;
}

/**
 * Construye la referencia visible de la venta original.
 */
function formatTicketReference(ticket: VentaTicketInterface): string {
  const serie: string | null = trimToNull(ticket.serie);

  return serie === null ? String(ticket.numero) : `${serie}-${ticket.numero}`;
}
