import type AppData from '@desktop-contracts/configuration/app-data.interface';
import { escapeHtml } from '@utils/html.utils';
import { centsToEuros, microsToEuros } from '@utils/money.utils';
import { trimToNull } from '@utils/string.utils';

const BUSINESS_LOGO_URL: string = 'osumi://assets/logo';

const TWITTER_ICON_URL: string = 'osumi://assets/app/icons/twitter.svg';

const FACEBOOK_ICON_URL: string = 'osumi://assets/app/icons/facebook.svg';

const INSTAGRAM_ICON_URL: string = 'osumi://assets/app/icons/instagram.svg';

const WEB_ICON_URL: string = 'osumi://assets/app/icons/web.svg';

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

export type TicketBusinessHeaderVariant = 'branded' | 'plain';

/**
 * Resuelve el nombre fiscal utilizado por los tickets
 * de venta y regalo.
 */
export function resolveFiscalTicketBusinessName(appData: AppData): string {
  return trimToNull(appData.nombre) ?? 'Osumi TPV';
}

/**
 * Resuelve el nombre preferido para un comprobante de reserva,
 * priorizando el nombre comercial sobre el fiscal.
 */
export function resolveCommercialTicketBusinessName(appData: AppData): string {
  return firstNotEmpty(appData.nombreComercial, appData.nombre) ?? 'Osumi TPV';
}

/**
 * Renderiza la cabecera común del establecimiento.
 *
 * La variante branded incluye logo y redes sociales.
 * La variante plain conserva la cabecera sencilla utilizada
 * actualmente por las reservas.
 */
export function renderTicketBusinessHeader(
  appData: AppData,
  businessName: string,
  variant: TicketBusinessHeaderVariant,
): string {
  const address: string | null = joinNotEmpty(appData.direccion, appData.poblacion);

  const businessSecondaryData: readonly string[] = [
    trimToNull(appData.cif) === null ? null : `CIF/NIF: ${appData.cif.trim()}`,
    trimToNull(appData.telefono) === null ? null : `Tel: ${appData.telefono.trim()}`,
  ].filter((value: string | null): value is string => value !== null);

  const logoHtml: string =
    variant === 'branded'
      ? `
      <img
        class="business__logo"
        src="${BUSINESS_LOGO_URL}"
        alt=""
      >
    `
      : '';

  const socialHtml: string = variant === 'branded' ? renderSocial(appData) : '';

  return `
    <header class="business">
      ${logoHtml}

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

      ${socialHtml}
    </header>
  `;
}

/**
 * Renderiza las frases personalizadas configuradas
 * al pie de los tickets que las admiten.
 */
export function renderTicketPhrases(phrases: readonly string[]): string {
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
 * Convierte una fecha persistida al formato local
 * utilizado por los tickets de venta.
 */
export function formatTicketDateTime(value: string): string {
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
 * Formatea un importe expresado en céntimos.
 */
export function formatTicketCents(cents: number): string {
  return currencyFormatter.format(centsToEuros(cents));
}

/**
 * Formatea un importe expresado en microeuros.
 */
export function formatTicketMicros(micros: number): string {
  return currencyFormatter.format(microsToEuros(micros));
}

/**
 * Formatea un porcentaje expresado en basis points.
 */
export function formatTicketPercentage(bps: number): string {
  return `${percentageFormatter.format(bps / 100)} %`;
}

/**
 * Renderiza las redes sociales configuradas.
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
 * Añade una red social únicamente cuando
 * tiene un valor configurado.
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
 * Devuelve el primer texto no vacío.
 */
function firstNotEmpty(...values: readonly string[]): string | null {
  for (const value of values) {
    const normalizedValue: string | null = trimToNull(value);

    if (normalizedValue !== null) {
      return normalizedValue;
    }
  }

  return null;
}

/**
 * Une únicamente los textos no vacíos.
 */
function joinNotEmpty(...values: readonly string[]): string | null {
  const normalizedValues: readonly string[] = values
    .map((value: string): string | null => trimToNull(value))
    .filter((value: string | null): value is string => value !== null);

  return normalizedValues.length === 0 ? null : normalizedValues.join(', ');
}

/**
 * Formatea un número de fecha con dos dígitos.
 */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
