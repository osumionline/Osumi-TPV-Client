/** Política fiscal que autoriza una confirmación remota. */
export type TiendaOnlineAckPolitica = 'solo-aceptada' | 'aceptada-o-no-aplica';

/**
 * Configuración operativa de una fuente de pedidos online.
 *
 * No incluye la URL ni las credenciales: ambas ya existen
 * en la configuración general de la instalación.
 */
export interface TiendaOnlineSyncConfig {
  readonly fuenteId: string;
  readonly zonaHoraria: string;
  readonly metodosPago: Readonly<Record<string, string>>;
  readonly politicaAck: TiendaOnlineAckPolitica;
}

/**
 * Interpreta equivalencias escritas como:
 *
 * cards=tarjeta
 * paypal=paypal
 *
 * No corrige identificadores silenciosamente.
 */
export function parseTiendaOnlineMetodosPago(
  value: string,
): Readonly<Record<string, string>> | null {
  if (typeof value !== 'string') {
    return null;
  }

  const lines: string[] = value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line !== '');

  if (lines.length === 0 || lines.length > 20) {
    return null;
  }

  const entries: [string, string][] = [];
  const seen: Set<string> = new Set<string>();

  for (const line of lines) {
    const separator: number = line.indexOf('=');

    if (separator <= 0 || line.indexOf('=', separator + 1) !== -1) {
      return null;
    }

    const remote: string = line.slice(0, separator).trim();
    const local: string = line.slice(separator + 1).trim();

    if (
      remote.length === 0 ||
      remote.length > 100 ||
      /[\r\n=]/.test(remote) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(local) ||
      local.length > 100 ||
      seen.has(remote)
    ) {
      return null;
    }

    seen.add(remote);
    entries.push([remote, local]);
  }

  return Object.fromEntries(entries);
}

/**
 * Representa las equivalencias en el formulario de ajustes.
 */
export function formatTiendaOnlineMetodosPago(value: Readonly<Record<string, string>>): string {
  return Object.entries(value)
    .map(([remote, local]: [string, string]): string => `${remote}=${local}`)
    .join('\n');
}

/**
 * Comprueba que una zona horaria es reconocida
 * por el entorno de ejecución.
 */
export function isTiendaOnlineZonaHoraria(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > 100
  ) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-GB', {
      timeZone: value,
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Valida una configuración externa o persistida
 * sin confiar en el tipado declarado del JSON.
 */
export function isTiendaOnlineSyncConfig(value: unknown): value is TiendaOnlineSyncConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  const methods: unknown = data['metodosPago'];

  if (typeof methods !== 'object' || methods === null || Array.isArray(methods)) {
    return false;
  }

  const mappings: Record<string, unknown> = methods as Record<string, unknown>;

  const entries: [string, unknown][] = Object.entries(mappings);

  if (!entries.every((entry: [string, unknown]): boolean => typeof entry[1] === 'string')) {
    return false;
  }

  const formatted: string = entries
    .map(([remote, local]: [string, unknown]): string => `${remote}=${String(local)}`)
    .join('\n');

  return (
    typeof data['fuenteId'] === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(data['fuenteId']) &&
    isTiendaOnlineZonaHoraria(data['zonaHoraria']) &&
    (data['politicaAck'] === 'solo-aceptada' || data['politicaAck'] === 'aceptada-o-no-aplica') &&
    parseTiendaOnlineMetodosPago(formatted) !== null
  );
}
