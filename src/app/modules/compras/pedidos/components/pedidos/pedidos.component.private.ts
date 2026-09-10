import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';

export const PEDIDOS_GUARDADOS_COLUMNS: readonly string[] = [
  'fechaPedido',
  'proveedor',
  'tipo',
  'importe',
];

export const PEDIDOS_RECEPCIONADOS_COLUMNS: readonly string[] = [
  'fechaRecepcionado',
  'fechaPedido',
  'fechaPago',
  'proveedor',
  'tipo',
  'importe',
  'ue',
];

const PEDIDO_TIPO_LABELS: Readonly<Record<PedidoTipo, string>> = {
  albaran: 'Albarán',
  factura: 'Factura',
  abono: 'Abono',
};

/**
 * Crea el estado inicial de cualquiera de los listados.
 */
export function createPedidoListadoDefaultState(): PedidoListadoWorkspaceState {
  return {
    fechaDesde: '',
    fechaHasta: '',
    idProveedor: null,
    numero: '',
    importeDesde: '',
    importeHasta: '',
    pagina: 1,
    num: 20,
  };
}

/**
 * Indica si existe algún filtro funcional activo.
 */
export function hasPedidoListadoFilters(state: PedidoListadoWorkspaceState): boolean {
  return (
    state.fechaDesde !== '' ||
    state.fechaHasta !== '' ||
    state.idProveedor !== null ||
    state.numero.trim() !== '' ||
    state.importeDesde.trim() !== '' ||
    state.importeHasta.trim() !== ''
  );
}

/**
 * Convierte un importe escrito en euros a microeuros
 * sin introducir aritmética decimal intermedia.
 */
export function parsePedidoFilterAmountMicros(value: string): number | null {
  const normalizedValue: string = value.trim().replace(',', '.');

  if (normalizedValue === '') {
    return null;
  }

  if (!/^\d+(?:\.\d{1,6})?$/.test(normalizedValue)) {
    throw new Error('El importe introducido no es válido.');
  }

  const [eurosPart, decimalsPart = ''] = normalizedValue.split('.');
  const euros: number = Number(eurosPart);
  const decimals: number = Number(decimalsPart.padEnd(6, '0'));
  const micros: number = euros * 1_000_000 + decimals;

  if (!Number.isSafeInteger(micros)) {
    throw new Error('El importe introducido supera el rango permitido.');
  }

  return micros;
}

/**
 * Formatea una fecha civil persistida sin reinterpretarla
 * mediante zonas horarias.
 */
export function formatPedidoDate(value: string | null): string {
  if (value === null || value.length < 10) {
    return '—';
  }

  const datePart: string = value.slice(0, 10);
  const match: RegExpMatchArray | null = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match === null) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Construye el texto documental mostrado en la tabla.
 */
export function formatPedidoTipo(tipo: PedidoTipo, numero: string | null): string {
  const label: string = PEDIDO_TIPO_LABELS[tipo];
  const normalizedNumber: string = numero?.trim() ?? '';

  return normalizedNumber === '' ? label : `${label}: ${normalizedNumber}`;
}
