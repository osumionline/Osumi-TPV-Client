import type {
  PedidoCabeceraInterface,
  PedidoProveedorOptionInterface,
  PedidoSaveCommand,
  PedidoTipoPagoOptionInterface,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';

export interface PurchaseOrderFormState {
  readonly id: number | null;
  readonly publicId: string | null;
  readonly idProveedor: number | null;
  readonly idTipoPago: number | null;
  readonly formaPago: string | null;
  readonly tipo: PedidoTipo;
  readonly numero: string;
  readonly fechaPedido: string;
  readonly fechaPago: string;
  readonly fechaRecepcionado: string | null;
  readonly recargoEquivalencia: boolean;
  readonly europeo: boolean;
  readonly recepcionado: boolean;
  readonly observaciones: string;
  readonly columnasVisibles: readonly number[];
}

export interface PurchaseOrderProviderOption {
  readonly idProveedor: number;
  readonly nombre: string;
  readonly historical: boolean;
}

export interface PurchaseOrderPaymentOption {
  readonly key: string;
  readonly idTipoPago: number | null;
  readonly formaPago: string;
  readonly label: string;
  readonly historical: boolean;
}

export interface PurchaseOrderColumnOption {
  readonly id: number;
  readonly label: string;
}

export type PurchaseOrderTextField = 'numero' | 'fechaPedido' | 'fechaPago' | 'observaciones';

export const PURCHASE_ORDER_COLUMN_OPTIONS: readonly PurchaseOrderColumnOption[] = [
  {
    id: 1,
    label: 'Ordenar',
  },
  {
    id: 4,
    label: 'Referencia',
  },
  {
    id: 5,
    label: 'Marca',
  },
  {
    id: 6,
    label: 'Código de barras',
  },
  {
    id: 8,
    label: 'Stock actual',
  },
  {
    id: 9,
    label: 'Stock final',
  },
  {
    id: 11,
    label: 'Descuento',
  },
  {
    id: 13,
    label: 'IVA',
  },
];

export const PURCHASE_ORDER_DEFAULT_VISIBLE_COLUMNS: readonly number[] = [1, 5];

const BUILTIN_PAYMENT_OPTIONS: readonly PurchaseOrderPaymentOption[] = [
  {
    key: 'builtin:domiciliacion',
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    label: 'Domiciliación bancaria',
    historical: false,
  },
  {
    key: 'builtin:transferencia',
    idTipoPago: null,
    formaPago: 'Transferencia bancaria',
    label: 'Transferencia bancaria',
    historical: false,
  },
];

/**
 * Construye el estado inicial de un pedido todavía no persistido.
 */
export function createNewPurchaseOrderFormState(
  recargoEquivalencia: boolean,
  today: Date = new Date(),
): PurchaseOrderFormState {
  return {
    id: null,
    publicId: null,
    idProveedor: null,
    idTipoPago: null,
    formaPago: null,
    tipo: 'albaran',
    numero: '',
    fechaPedido: formatCivilDate(today),
    fechaPago: '',
    fechaRecepcionado: null,
    recargoEquivalencia,
    europeo: false,
    recepcionado: false,
    observaciones: '',
    columnasVisibles: [...PURCHASE_ORDER_DEFAULT_VISIBLE_COLUMNS],
  };
}

/**
 * Convierte la cabecera persistida al estado editable del renderer.
 */
export function createExistingPurchaseOrderFormState(
  pedido: PedidoCabeceraInterface,
): PurchaseOrderFormState {
  return {
    id: pedido.id,
    publicId: pedido.publicId,
    idProveedor: pedido.idProveedor,
    idTipoPago: pedido.idTipoPago,
    formaPago: pedido.formaPago,
    tipo: pedido.tipo,
    numero: pedido.numero ?? '',
    fechaPedido: normalizeCivilDateValue(pedido.fechaPedido),
    fechaPago: normalizeCivilDateValue(pedido.fechaPago),
    fechaRecepcionado: pedido.fechaRecepcionado,
    recargoEquivalencia: pedido.recargoEquivalencia,
    europeo: pedido.europeo,
    recepcionado: pedido.recepcionado,
    observaciones: pedido.observaciones ?? '',
    columnasVisibles: [...pedido.columnasVisibles],
  };
}

/**
 * Añade el proveedor histórico del pedido cuando ya no
 * pertenece al catálogo de proveedores activos.
 */
export function buildPurchaseOrderProviderOptions(
  proveedores: readonly PedidoProveedorOptionInterface[],
  pedido: PedidoCabeceraInterface | null,
): readonly PurchaseOrderProviderOption[] {
  const options: PurchaseOrderProviderOption[] = proveedores.map(
    (proveedor: PedidoProveedorOptionInterface): PurchaseOrderProviderOption => ({
      idProveedor: proveedor.idProveedor,
      nombre: proveedor.nombre,
      historical: false,
    }),
  );

  if (
    pedido !== null &&
    !options.some(
      (option: PurchaseOrderProviderOption): boolean => option.idProveedor === pedido.idProveedor,
    )
  ) {
    options.push({
      idProveedor: pedido.idProveedor,
      nombre: pedido.proveedorNombre,
      historical: true,
    });
  }

  return options;
}

/**
 * Incorpora un proveedor recién creado a las opciones de la ficha,
 * sustituyendo cualquier versión histórica previa y manteniendo
 * el orden alfabético.
 */
export function addPurchaseOrderProviderOption(
  options: readonly PurchaseOrderProviderOption[],
  idProveedor: number,
  nombre: string,
): readonly PurchaseOrderProviderOption[] {
  return [
    ...options.filter(
      (option: PurchaseOrderProviderOption): boolean => option.idProveedor !== idProveedor,
    ),
    {
      idProveedor,
      nombre,
      historical: false,
    },
  ].sort((left: PurchaseOrderProviderOption, right: PurchaseOrderProviderOption): number =>
    left.nombre.localeCompare(right.nombre, 'es', {
      sensitivity: 'base',
    }),
  );
}

/**
 * Construye las dos formas propias de Compras, los tipos
 * configurables y, cuando sea necesario, el snapshot histórico.
 */
export function buildPurchaseOrderPaymentOptions(
  tiposPago: readonly PedidoTipoPagoOptionInterface[],
  pedido: PedidoCabeceraInterface | null,
): readonly PurchaseOrderPaymentOption[] {
  const options: PurchaseOrderPaymentOption[] = [
    ...BUILTIN_PAYMENT_OPTIONS,
    ...tiposPago.map((tipoPago: PedidoTipoPagoOptionInterface): PurchaseOrderPaymentOption => ({
      key: `type:${tipoPago.idTipoPago}`,
      idTipoPago: tipoPago.idTipoPago,
      formaPago: tipoPago.nombre,
      label: tipoPago.nombre,
      historical: false,
    })),
  ];

  if (pedido?.formaPago === null || pedido?.formaPago === undefined) {
    return options;
  }

  const exactMatch: boolean = options.some(
    (option: PurchaseOrderPaymentOption): boolean =>
      option.idTipoPago === pedido.idTipoPago && option.formaPago === pedido.formaPago,
  );

  if (!exactMatch) {
    options.push({
      key: 'historical',
      idTipoPago: pedido.idTipoPago,
      formaPago: pedido.formaPago,
      label: pedido.formaPago,
      historical: true,
    });
  }

  return options;
}

/**
 * Obtiene la clave visual correspondiente a la forma
 * de pago actualmente seleccionada.
 */
export function getPurchaseOrderPaymentKey(
  state: PurchaseOrderFormState,
  options: readonly PurchaseOrderPaymentOption[],
): string {
  return (
    options.find(
      (option: PurchaseOrderPaymentOption): boolean =>
        option.idTipoPago === state.idTipoPago && option.formaPago === state.formaPago,
    )?.key ?? ''
  );
}

/**
 * Convierte el parámetro de ruta en un identificador válido.
 */
export function parsePurchaseOrderRouteId(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('El identificador del pedido no es válido.');
  }

  const idPedido: number = Number(value);

  if (!Number.isSafeInteger(idPedido)) {
    throw new Error('El identificador del pedido no es válido.');
  }

  return idPedido;
}

/**
 * Convierte el valor de un select nativo en un tipo documental.
 */
export function parsePurchaseOrderTipo(value: string): PedidoTipo {
  if (value === 'albaran' || value === 'factura' || value === 'abono') {
    return value;
  }

  throw new Error('El tipo documental del pedido no es válido.');
}

/**
 * Normaliza la selección recibida desde el selector múltiple
 * de columnas opcionales.
 */
export function normalizePurchaseOrderColumns(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set<number>(
      value.filter(
        (idColumna: unknown): idColumna is number =>
          typeof idColumna === 'number' &&
          Number.isSafeInteger(idColumna) &&
          PEDIDO_OPTIONAL_COLUMN_IDS.includes(idColumna),
      ),
    ),
  ];
}

/**
 * Construye el comando de persistencia a partir del estado
 * editable actual de la ficha.
 */
export function buildPurchaseOrderSaveCommand(state: PurchaseOrderFormState): PedidoSaveCommand {
  if (state.idProveedor === null) {
    throw new Error('Debes seleccionar un proveedor.');
  }

  return {
    id: state.id,
    idProveedor: state.idProveedor,
    idTipoPago: state.idTipoPago,
    formaPago: normalizeOptionalText(state.formaPago),
    tipo: state.tipo,
    numero: normalizeOptionalText(state.numero),
    fechaPedido: normalizeOptionalText(state.fechaPedido),
    fechaPago: normalizeOptionalText(state.fechaPago),
    recargoEquivalencia: state.recargoEquivalencia,
    europeo: state.europeo,
    observaciones: normalizeOptionalText(state.observaciones),
    columnasVisibles: [...state.columnasVisibles],
  };
}

/**
 * Convierte un valor textual vacío en NULL y elimina
 * espacios exteriores del resto de valores.
 */
function normalizeOptionalText(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalized: string = value.trim();

  return normalized === '' ? null : normalized;
}

/**
 * Formatea una fecha JavaScript como fecha civil local.
 */
function formatCivilDate(value: Date): string {
  const year: string = String(value.getFullYear());
  const month: string = String(value.getMonth() + 1).padStart(2, '0');
  const day: string = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Extrae la parte civil de una fecha persistida sin
 * introducir conversiones de zona horaria.
 */
function normalizeCivilDateValue(value: string | null): string {
  return value === null ? '' : value.slice(0, 10);
}
