import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoProveedorOptionInterface,
  PedidoSaveCommand,
  PedidoTipoPagoOptionInterface,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import type PedidoLineaSaveCommand from '@desktop-contracts/compras/pedidos/pedido-linea-save.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type PurchaseOrderLineBarcodeChange from '@model/compras/pedidos/purchase-order-line-barcode-change.interface';
import PurchaseOrderLineCalculator from '@model/compras/pedidos/purchase-order-line-calculator';
import type PurchaseOrderLineEconomicChange from '@model/compras/pedidos/purchase-order-line-economic-change.interface';
import type PurchaseOrderLineMove from '@model/compras/pedidos/purchase-order-line-move.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import type PurchaseOrderLineTaxChange from '@model/compras/pedidos/purchase-order-line-tax-change.interface';
import type PurchaseOrderLineUnitsChange from '@model/compras/pedidos/purchase-order-line-units-change.interface';
import type PurchaseOrderTaxPair from '@model/compras/pedidos/purchase-order-tax-pair.interface';

/**
 * Convierte las listas paralelas IVA/RE de configuración
 * en las parejas fiscales utilizadas por Pedidos.
 */
export function buildPurchaseOrderTaxPairs(
  ivaList: readonly number[],
  reList: readonly number[],
): readonly PurchaseOrderTaxPair[] {
  if (ivaList.length !== reList.length) {
    throw new Error('La configuración de IVA y RE no contiene el mismo número de valores.');
  }

  const pairs: PurchaseOrderTaxPair[] = [];

  for (let index: number = 0; index < ivaList.length; index++) {
    const iva: number | undefined = ivaList[index];

    const recargoEquivalencia: number | undefined = reList[index];

    if (iva === undefined || recargoEquivalencia === undefined) {
      throw new Error('La configuración fiscal de Pedidos no es válida.');
    }

    const pair: PurchaseOrderTaxPair = {
      ivaBps: convertPurchaseOrderPercentToBps(iva),
      recargoEquivalenciaBps: convertPurchaseOrderPercentToBps(recargoEquivalencia),
    };

    if (
      !pairs.some(
        (currentPair: PurchaseOrderTaxPair): boolean =>
          currentPair.ivaBps === pair.ivaBps &&
          currentPair.recargoEquivalenciaBps === pair.recargoEquivalenciaBps,
      )
    ) {
      pairs.push(pair);
    }
  }

  return pairs;
}

/**
 * Cambia IVA o RE manteniendo sincronizada su pareja
 * fiscal y recalculando PUC y Margen.
 */
export function updatePurchaseOrderLineTax(
  lines: readonly PurchaseOrderLineState[],
  change: PurchaseOrderLineTaxChange,
  taxPairs: readonly PurchaseOrderTaxPair[],
  aplicarRecargoEquivalencia: boolean,
): readonly PurchaseOrderLineState[] {
  if (!Number.isSafeInteger(change.value) || change.value < 0) {
    return lines;
  }

  const lineIndex: number = lines.findIndex(
    (line: PurchaseOrderLineState): boolean => line.key === change.lineKey,
  );

  if (lineIndex === -1) {
    return lines;
  }

  const line: PurchaseOrderLineState | undefined = lines[lineIndex];

  if (line === undefined) {
    return lines;
  }

  let ivaBps: number = line.ivaBps;

  let recargoEquivalenciaBps: number = line.recargoEquivalenciaBps;

  if (change.field === 'ivaBps') {
    ivaBps = change.value;

    const pair: PurchaseOrderTaxPair | undefined = taxPairs.find(
      (currentPair: PurchaseOrderTaxPair): boolean => currentPair.ivaBps === change.value,
    );

    if (pair !== undefined) {
      recargoEquivalenciaBps = pair.recargoEquivalenciaBps;
    }
  } else {
    recargoEquivalenciaBps = change.value;

    const pair: PurchaseOrderTaxPair | undefined = taxPairs.find(
      (currentPair: PurchaseOrderTaxPair): boolean =>
        currentPair.recargoEquivalenciaBps === change.value,
    );

    if (pair !== undefined) {
      ivaBps = pair.ivaBps;
    }
  }

  if (ivaBps === line.ivaBps && recargoEquivalenciaBps === line.recargoEquivalenciaBps) {
    return lines;
  }

  const updatedLine: PurchaseOrderLineState = PurchaseOrderLineCalculator.actualizarFiscalidad(
    line,
    ivaBps,
    recargoEquivalenciaBps,
    aplicarRecargoEquivalencia,
  );

  return lines.map((currentLine: PurchaseOrderLineState, index: number): PurchaseOrderLineState =>
    index === lineIndex ? updatedLine : currentLine,
  );
}

/**
 * Recalcula todas las líneas al activar o desactivar
 * el Recargo de Equivalencia del Pedido.
 */
export function recalculatePurchaseOrderLinesForRecargo(
  lines: readonly PurchaseOrderLineState[],
  taxPairs: readonly PurchaseOrderTaxPair[],
  aplicarRecargoEquivalencia: boolean,
): readonly PurchaseOrderLineState[] {
  if (lines.length === 0) {
    return lines;
  }

  return lines.map((line: PurchaseOrderLineState): PurchaseOrderLineState => {
    if (!aplicarRecargoEquivalencia) {
      return PurchaseOrderLineCalculator.recalcularPorRecargoEquivalencia(line, false);
    }

    const pair: PurchaseOrderTaxPair | undefined = taxPairs.find(
      (currentPair: PurchaseOrderTaxPair): boolean => currentPair.ivaBps === line.ivaBps,
    );

    if (pair === undefined) {
      return PurchaseOrderLineCalculator.recalcularPorRecargoEquivalencia(line, true);
    }

    return PurchaseOrderLineCalculator.actualizarFiscalidad(
      line,
      pair.ivaBps,
      pair.recargoEquivalenciaBps,
      true,
    );
  });
}

/**
 * Aplica un cambio económico a una línea pendiente
 * utilizando exclusivamente el calculador de Pedido.
 */
export function updatePurchaseOrderLineEconomic(
  lines: readonly PurchaseOrderLineState[],
  change: PurchaseOrderLineEconomicChange,
  aplicarRecargoEquivalencia: boolean,
): readonly PurchaseOrderLineState[] {
  const lineIndex: number = lines.findIndex(
    (line: PurchaseOrderLineState): boolean => line.key === change.lineKey,
  );

  if (lineIndex === -1) {
    return lines;
  }

  const line: PurchaseOrderLineState | undefined = lines[lineIndex];

  if (line === undefined || line[change.field] === change.value) {
    return lines;
  }

  let updatedLine: PurchaseOrderLineState;

  switch (change.field) {
    case 'palbMicros':
      updatedLine = PurchaseOrderLineCalculator.actualizarPrecioAlbaran(
        line,
        change.value,
        aplicarRecargoEquivalencia,
      );
      break;

    case 'descuentoBps':
      updatedLine = PurchaseOrderLineCalculator.actualizarDescuento(
        line,
        change.value,
        aplicarRecargoEquivalencia,
      );
      break;

    case 'pvpMicros':
      updatedLine = PurchaseOrderLineCalculator.actualizarPvp(line, change.value);
      break;
  }

  return lines.map((currentLine: PurchaseOrderLineState, index: number): PurchaseOrderLineState =>
    index === lineIndex ? updatedLine : currentLine,
  );
}

/**
 * Actualiza el código de barras adicional pendiente
 * de una línea que todavía permite introducirlo.
 */
export function updatePurchaseOrderLineBarcode(
  lines: readonly PurchaseOrderLineState[],
  change: PurchaseOrderLineBarcodeChange,
): readonly PurchaseOrderLineState[] {
  const lineIndex: number = lines.findIndex(
    (line: PurchaseOrderLineState): boolean => line.key === change.lineKey,
  );

  if (lineIndex === -1) {
    return lines;
  }

  const line: PurchaseOrderLineState | undefined = lines[lineIndex];

  if (line === undefined || line.tieneCodigoBarrasAdicional) {
    return lines;
  }

  const codigoBarras: string | null =
    change.codigoBarras === null || change.codigoBarras.length === 0 ? null : change.codigoBarras;

  if (codigoBarras !== null && codigoBarras.length > 100) {
    return lines;
  }

  if (line.codigoBarras === codigoBarras) {
    return lines;
  }

  return lines.map((currentLine: PurchaseOrderLineState, index: number): PurchaseOrderLineState =>
    index === lineIndex
      ? {
          ...line,
          codigoBarras,
        }
      : currentLine,
  );
}

/**
 * Mueve una línea una posición dentro del Pedido y
 * normaliza el orden resultante.
 */
export function movePurchaseOrderLine(
  lines: readonly PurchaseOrderLineState[],
  move: PurchaseOrderLineMove,
): readonly PurchaseOrderLineState[] {
  const sourceIndex: number = lines.findIndex(
    (line: PurchaseOrderLineState): boolean => line.key === move.lineKey,
  );

  if (sourceIndex === -1) {
    return lines;
  }

  const targetIndex: number = move.direction === 'up' ? sourceIndex - 1 : sourceIndex + 1;

  if (targetIndex < 0 || targetIndex >= lines.length) {
    return lines;
  }

  const reorderedLines: PurchaseOrderLineState[] = [...lines];

  const [movedLine] = reorderedLines.splice(sourceIndex, 1);

  if (movedLine === undefined) {
    return lines;
  }

  reorderedLines.splice(targetIndex, 0, movedLine);

  return normalizePurchaseOrderLineOrder(reorderedLines);
}

/**
 * Elimina una línea del estado editable y normaliza
 * el orden de las líneas restantes.
 */
export function removePurchaseOrderLine(
  lines: readonly PurchaseOrderLineState[],
  lineKey: string,
): readonly PurchaseOrderLineState[] {
  if (!lines.some((line: PurchaseOrderLineState): boolean => line.key === lineKey)) {
    return lines;
  }

  return normalizePurchaseOrderLineOrder(
    lines.filter((line: PurchaseOrderLineState): boolean => line.key !== lineKey),
  );
}

/**
 * Renumera las líneas según su posición actual.
 */
function normalizePurchaseOrderLineOrder(
  lines: readonly PurchaseOrderLineState[],
): readonly PurchaseOrderLineState[] {
  return lines.map((line: PurchaseOrderLineState, index: number): PurchaseOrderLineState =>
    line.orden === index
      ? line
      : {
          ...line,
          orden: index,
        },
  );
}

export interface AddPurchaseOrderArticleResult {
  readonly lines: readonly PurchaseOrderLineState[];
  readonly added: boolean;
  readonly lineKey: string;
}

export interface AddPurchaseOrderArticlesResult {
  readonly lines: readonly PurchaseOrderLineState[];
  readonly duplicateLineKey: string | null;
}

/**
 * Convierte una línea persistida en el estado editable
 * utilizado por la ficha de Pedido.
 */
export function createExistingPurchaseOrderLineState(
  line: PedidoLineaInterface,
): PurchaseOrderLineState {
  return {
    ...line,
    key: `line:${line.id}`,
  };
}

/**
 * Construye una línea nueva a partir del estado canónico
 * actual del artículo seleccionado.
 */
export function createNewPurchaseOrderLineState(
  articulo: PedidoArticuloInterface,
  orden: number,
): PurchaseOrderLineState {
  return {
    key: `article:${articulo.id}`,
    id: null,
    publicId: null,
    orden,
    idArticulo: articulo.id,
    localizador: articulo.localizador,
    nombreArticulo: articulo.nombre,
    referencia: articulo.referencia,
    marcaNombre: articulo.marcaNombre,
    codigoBarras: null,
    tieneCodigoBarrasAdicional: articulo.tieneCodigoBarrasAdicional,
    unidades: 0,
    stockActual: articulo.stock,
    stockFinal: articulo.stock,
    palbMicros: articulo.palbMicros,
    pucMicros: articulo.pucMicros,
    pvpMicros: articulo.pvpMicros,
    margenMicroporcentaje: articulo.margenMicroporcentaje,
    ivaBps: articulo.ivaBps,
    recargoEquivalenciaBps: articulo.recargoEquivalenciaBps,
    descuentoBps: 0,
  };
}

/**
 * Incorpora un artículo al final del Pedido sin permitir
 * una segunda línea para el mismo artículo.
 */
export function addPurchaseOrderArticle(
  lines: readonly PurchaseOrderLineState[],
  articulo: PedidoArticuloInterface,
): AddPurchaseOrderArticleResult {
  const existingLine: PurchaseOrderLineState | undefined = lines.find(
    (line: PurchaseOrderLineState): boolean =>
      line.idArticulo === articulo.id ||
      (line.idArticulo === null && line.localizador === articulo.localizador),
  );

  if (existingLine !== undefined) {
    return {
      lines,
      added: false,
      lineKey: existingLine.key,
    };
  }

  const nextOrder: number =
    lines.reduce(
      (maxOrder: number, line: PurchaseOrderLineState): number => Math.max(maxOrder, line.orden),
      -1,
    ) + 1;

  const newLine: PurchaseOrderLineState = createNewPurchaseOrderLineState(articulo, nextOrder);

  return {
    lines: [...lines, newLine],
    added: true,
    lineKey: newLine.key,
  };
}

/**
 * Incorpora varios artículos al Pedido en el orden recibido,
 * omitiendo duplicados y devolviendo la primera línea
 * existente que deba recibir el foco.
 */
export function addPurchaseOrderArticles(
  lines: readonly PurchaseOrderLineState[],
  articulos: readonly PedidoArticuloInterface[],
): AddPurchaseOrderArticlesResult {
  let resultLines: readonly PurchaseOrderLineState[] = lines;

  let duplicateLineKey: string | null = null;

  for (const articulo of articulos) {
    const result: AddPurchaseOrderArticleResult = addPurchaseOrderArticle(resultLines, articulo);

    resultLines = result.lines;

    if (!result.added && duplicateLineKey === null) {
      duplicateLineKey = result.lineKey;
    }
  }

  return {
    lines: resultLines,
    duplicateLineKey,
  };
}

/**
 * Actualiza las unidades de una línea editable y recalcula
 * su stock final cuando se conoce el stock actual.
 */
export function updatePurchaseOrderLineUnits(
  lines: readonly PurchaseOrderLineState[],
  change: PurchaseOrderLineUnitsChange,
): readonly PurchaseOrderLineState[] {
  if (!Number.isSafeInteger(change.unidades) || change.unidades < 0) {
    return lines;
  }

  const lineIndex: number = lines.findIndex(
    (line: PurchaseOrderLineState): boolean => line.key === change.lineKey,
  );

  if (lineIndex === -1) {
    return lines;
  }

  const line: PurchaseOrderLineState | undefined = lines[lineIndex];

  if (line === undefined || line.unidades === change.unidades) {
    return lines;
  }

  const updatedLine: PurchaseOrderLineState = {
    ...line,
    unidades: change.unidades,
    stockFinal: line.stockActual === null ? null : line.stockActual + change.unidades,
  };

  return lines.map((currentLine: PurchaseOrderLineState, index: number): PurchaseOrderLineState =>
    index === lineIndex ? updatedLine : currentLine,
  );
}

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
export function buildPurchaseOrderSaveCommand(
  state: PurchaseOrderFormState,
  lines: readonly PurchaseOrderLineState[],
): PedidoSaveCommand {
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
    lineas: lines.map((line: PurchaseOrderLineState, index: number): PedidoLineaSaveCommand =>
      buildPurchaseOrderLineSaveCommand(line, index),
    ),
  };
}

/**
 * Convierte el estado visual de una línea en
 * su contrato mínimo de persistencia.
 */
function buildPurchaseOrderLineSaveCommand(
  line: PurchaseOrderLineState,
  orden: number,
): PedidoLineaSaveCommand {
  if (line.id === null && line.idArticulo === null) {
    throw new Error('Una línea nueva debe estar vinculada a un artículo.');
  }

  return {
    id: line.id,
    idArticulo: line.idArticulo,
    orden,
    codigoBarras: normalizeOptionalText(line.codigoBarras),
    unidades: line.unidades,
    palbMicros: line.palbMicros,
    pucMicros: line.pucMicros,
    pvpMicros: line.pvpMicros,
    margenMicroporcentaje: line.margenMicroporcentaje,
    ivaBps: line.ivaBps,
    recargoEquivalenciaBps: line.recargoEquivalenciaBps,
    descuentoBps: line.descuentoBps,
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

/**
 * Convierte un porcentaje configurado a basis points
 * asegurando una precisión máxima de dos decimales.
 */
function convertPurchaseOrderPercentToBps(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('La configuración fiscal contiene un porcentaje no válido.');
  }

  const scaledValue: number = value * 100;

  const result: number = Math.round(scaledValue);

  if (!Number.isSafeInteger(result) || Math.abs(scaledValue - result) > 1e-9) {
    throw new Error('La configuración fiscal admite como máximo dos decimales.');
  }

  return result;
}
