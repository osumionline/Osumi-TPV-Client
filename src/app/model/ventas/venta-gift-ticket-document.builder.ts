import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  VentaTicketInterface,
  VentaTicketLineaInterface,
} from '@desktop-contracts/ventas/venta-ticket.interface';
import {
  buildVentaTicketQrContent,
  buildVentaTicketQrSvg,
} from '@model/ventas/venta-ticket-qr.utils';
import { escapeHtml } from '@utils/html.utils';
import { trimToNull } from '@utils/string.utils';

const BUSINESS_LOGO_URL: string = 'osumi://assets/logo';

const TWITTER_ICON_URL: string = 'osumi://assets/app/icons/twitter.svg';

const FACEBOOK_ICON_URL: string = 'osumi://assets/app/icons/facebook.svg';

const INSTAGRAM_ICON_URL: string = 'osumi://assets/app/icons/instagram.svg';

const WEB_ICON_URL: string = 'osumi://assets/app/icons/web.svg';

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

  const businessName: string = trimToNull(appData.nombre) ?? 'Osumi TPV';

  const address: string | null = joinNotEmpty(appData.direccion, appData.poblacion);

  const businessSecondaryData: readonly string[] = [
    trimToNull(appData.cif) === null ? null : `CIF/NIF: ${appData.cif.trim()}`,
    trimToNull(appData.telefono) === null ? null : `Tel: ${appData.telefono.trim()}`,
  ].filter((value: string | null): value is string => value !== null);

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
    <header class="business">
      <img
        class="business__logo"
        src="${BUSINESS_LOGO_URL}"
        alt=""
      >

      <div class="business__name">
        ${escapeHtml(businessName)}
      </div>

      ${
        address === null
          ? ''
          : `
            <div class="business__line">
              ${escapeHtml(address)}
            </div>
          `
      }

      ${
        businessSecondaryData.length === 0
          ? ''
          : `
            <div class="business__line">
              ${escapeHtml(businessSecondaryData.join(' · '))}
            </div>
          `
      }

      ${renderSocial(appData)}
    </header>

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
          ${escapeHtml(formatVentaFecha(ticket.fecha))}
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
 * Renderiza las redes sociales configuradas para el negocio.
 */
function renderSocial(appData: AppData): string {
  const items: string[] = [];

  addSocialItem(items, TWITTER_ICON_URL, 'Twitter', appData.twitter);

  addSocialItem(items, FACEBOOK_ICON_URL, 'Facebook', appData.facebook);

  addSocialItem(items, INSTAGRAM_ICON_URL, 'Instagram', appData.instagram);

  addSocialItem(items, WEB_ICON_URL, 'Web', appData.web);

  if (items.length === 0) {
    return '';
  }

  return `
    <div class="social">
      ${items.join('')}
    </div>
  `;
}

/**
 * Añade una red social cuando tiene un valor configurado.
 */
function addSocialItem(items: string[], iconUrl: string, iconAlt: string, value: string): void {
  const normalizedValue: string | null = trimToNull(value);

  if (normalizedValue === null) {
    return;
  }

  items.push(`
    <div class="social__item">
      <img
        class="social__icon"
        src="${iconUrl}"
        alt="${escapeHtml(iconAlt)}"
      >

      <span class="social__value">
        ${escapeHtml(normalizedValue)}
      </span>
    </div>
  `);
}

/**
 * Renderiza las frases configuradas al pie del ticket.
 */
function renderTicketPhrases(phrases: readonly string[]): string {
  const normalizedPhrases: readonly string[] = phrases
    .map((phrase: string): string => phrase.trim())
    .filter((phrase: string): boolean => phrase !== '');

  if (normalizedPhrases.length === 0) {
    return '';
  }

  return `
    <footer class="footer">
      ${normalizedPhrases
        .map(
          (phrase: string): string => `
            <div class="footer__phrase">
              ${escapeHtml(phrase)}
            </div>
          `,
        )
        .join('')}
    </footer>
  `;
}

/**
 * Construye la referencia visible de la venta original.
 */
function formatTicketReference(ticket: VentaTicketInterface): string {
  const serie: string | null = trimToNull(ticket.serie);

  return serie === null ? String(ticket.numero) : `${serie}-${ticket.numero}`;
}

/**
 * Convierte la fecha persistida al formato local del ticket.
 */
function formatVentaFecha(value: string): string {
  const normalizedValue: string = value.trim();

  const date: Date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  return (
    [pad2(date.getDate()), pad2(date.getMonth() + 1), date.getFullYear()].join('/') +
    ` ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

/**
 * Formatea un componente de fecha con dos dígitos.
 */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Une únicamente valores de dirección no vacíos.
 */
function joinNotEmpty(...values: readonly string[]): string | null {
  const normalizedValues: readonly string[] = values
    .map((value: string): string | null => trimToNull(value))
    .filter((value: string | null): value is string => value !== null);

  return normalizedValues.length === 0 ? null : normalizedValues.join(', ');
}
