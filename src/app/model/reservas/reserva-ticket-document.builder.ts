import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  default as ReservaInterface,
  ReservaLineaInterface,
} from '@desktop-contracts/reservas/reserva.interface';
import {
  formatTicketMicros,
  renderTicketBusinessHeader,
  resolveCommercialTicketBusinessName,
} from '@model/tickets/ticket-document-shared.utils';
import { formatIsoDateToSpanishDate } from '@utils/date.utils';
import { escapeHtml } from '@utils/html.utils';
import { trimToNull } from '@utils/string.utils';

/**
 * Construye el comprobante imprimible de una reserva.
 *
 * Se genera a partir de la reserva ya persistida, no de
 * VentaEnCurso, para que el documento represente exactamente
 * el estado que ha quedado almacenado.
 */
export default function buildReservaTicketDocument(
  appData: AppData,
  reserva: ReservaInterface,
): string {
  const businessName: string = resolveCommercialTicketBusinessName(appData);

  const documentTitle: string = `Reserva ${reserva.id} - ${businessName}`;

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
      margin: 0;
      color: #111;
      background: #eceff1;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      min-height: 100vh;
    }

    .ticket {
      width: 80mm;
      padding: 4mm;
      background: #fff;
      font-size: 9pt;
      line-height: 1.3;
    }

    .business {
      margin-bottom: 4mm;
      text-align: center;
    }

    .business__name {
      margin: 0 0 1.5mm;
      font-size: 14pt;
      font-weight: 700;
    }

    .business__line {
      margin: .5mm 0;
    }

    .ticket__title {
      margin: 4mm 0 1mm;
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
      margin-bottom: 4mm;
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

    .line__brand {
      margin: .8mm 0 0 7mm;
      color: #555;
      font-size: 8pt;
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

    .pending {
      margin-top: 4mm;
      padding: 2mm;
      border: 1px solid #111;
      font-weight: 700;
      text-align: center;
    }

    .footer {
      margin-top: 4mm;
      color: #444;
      font-size: 7.5pt;
      line-height: 1.35;
      text-align: center;
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
    ${renderTicketBusinessHeader(appData, businessName, 'plain')}

    <div class="ticket__title">
      RESERVA
    </div>

    <div class="ticket__reference">
      Reserva nº ${reserva.id}
    </div>

    <section class="data">
      <div class="data__row">
        <span class="data__label">
          Fecha
        </span>

        <span class="data__value">
          ${escapeHtml(formatReservaFecha(reserva.fecha))}
        </span>
      </div>

      <div class="data__row">
        <span class="data__label">
          Cliente
        </span>

        <span class="data__value">
          ${escapeHtml(reserva.clienteNombre)}
        </span>
      </div>
    </section>

    <section class="lines">
      ${reserva.lineas.map((linea: ReservaLineaInterface): string => renderLinea(linea)).join('')}
    </section>

    <div class="total">
      <span>
        TOTAL
      </span>

      <span>
        ${escapeHtml(formatTicketMicros(reserva.totalMicros))}
      </span>
    </div>

    <div class="pending">
      PENDIENTE DE PAGO
    </div>

    <footer class="footer">
      Este comprobante corresponde a una reserva.
      No constituye un ticket o factura de venta.
    </footer>
  </main>
</body>
</html>
  `.trim();
}

function renderLinea(linea: ReservaLineaInterface): string {
  const marca: string | null = trimToNull(linea.marca);

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

      ${
        marca === null
          ? ''
          : `
            <div class="line__brand">
              ${escapeHtml(marca)}
            </div>
          `
      }

      <div class="line__amounts">
        <span class="line__unit-price">
          ${escapeHtml(formatTicketMicros(linea.pvpMicros))} / ud.
        </span>

        <span class="line__total">
          ${escapeHtml(formatTicketMicros(linea.importeMicros))}
        </span>
      </div>
    </article>
  `;
}

function formatReservaFecha(value: string): string {
  const normalizedValue: string = value.trim();

  const date: string = formatIsoDateToSpanishDate(normalizedValue);

  const timeMatch: RegExpExecArray | null = /(?:T|\s)(\d{2}):(\d{2})/.exec(normalizedValue);

  if (timeMatch === null) {
    return date;
  }

  return `${date} ${timeMatch[1]}:${timeMatch[2]}`;
}
