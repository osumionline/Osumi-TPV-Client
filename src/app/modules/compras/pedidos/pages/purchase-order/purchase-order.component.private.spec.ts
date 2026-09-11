import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import type PurchaseOrderLineUnitsChange from '@model/compras/pedidos/purchase-order-line-units-change.interface';
import {
  addPurchaseOrderArticle,
  AddPurchaseOrderArticleResult,
  addPurchaseOrderArticles,
  addPurchaseOrderProviderOption,
  buildPurchaseOrderPaymentOptions,
  buildPurchaseOrderProviderOptions,
  buildPurchaseOrderSaveCommand,
  createExistingPurchaseOrderFormState,
  createExistingPurchaseOrderLineState,
  createNewPurchaseOrderFormState,
  createNewPurchaseOrderLineState,
  getPurchaseOrderPaymentKey,
  normalizePurchaseOrderColumns,
  parsePurchaseOrderRouteId,
  parsePurchaseOrderTipo,
  PURCHASE_ORDER_COLUMN_OPTIONS,
  updatePurchaseOrderLineUnits,
  type AddPurchaseOrderArticlesResult,
} from '@modules/compras/pedidos/pages/purchase-order/purchase-order.component.private';
import { describe, expect, it } from 'vitest';

const FORM_OPTIONS: PedidoFormOptionsInterface = {
  proveedores: [
    {
      idProveedor: 1,
      nombre: 'Proveedor activo',
    },
  ],
  tiposPago: [
    {
      idTipoPago: 10,
      nombre: 'Tarjeta',
    },
    {
      idTipoPago: 11,
      nombre: 'Paypal',
    },
  ],
};

/**
 * Construye una cabecera persistida representativa.
 */
function createPedido(overrides: Partial<PedidoCabeceraInterface> = {}): PedidoCabeceraInterface {
  return {
    id: 8,
    publicId: 'order-8',
    idProveedor: 1,
    proveedorNombre: 'Proveedor activo',
    idTipoPago: 10,
    formaPago: 'Tarjeta',
    tipo: 'factura',
    numero: 'FAC-8',
    fechaPedido: '2026-09-10 10:30:00',
    fechaPago: null,
    fechaRecepcionado: null,
    recargoEquivalencia: true,
    europeo: false,
    recepcionado: false,
    observaciones: null,
    columnasVisibles: [1, 4],
    ...overrides,
  };
}

/**
 * Construye una línea persistida representativa.
 */
function createPedidoLinea(overrides: Partial<PedidoLineaInterface> = {}): PedidoLineaInterface {
  return {
    id: 20,
    publicId: 'order-line-20',
    orden: 0,
    idArticulo: 8,
    localizador: 260458,
    nombreArticulo: 'Artículo persistido',
    referencia: 'REF-20',
    marcaNombre: 'Marca',
    codigoBarras: null,
    unidades: 4,
    stockActual: 10,
    stockFinal: 14,
    palbMicros: 570_000,
    pucMicros: 630_000,
    pvpMicros: 990_000,
    margenMicroporcentaje: 36_363_636,
    ivaBps: 1000,
    recargoEquivalenciaBps: 140,
    descuentoBps: 0,
    ...overrides,
  };
}

/**
 * Construye un artículo representativo para añadirlo
 * a una línea editable de Pedido.
 */
function createPedidoArticulo(
  overrides: Partial<PedidoArticuloInterface> = {},
): PedidoArticuloInterface {
  return {
    id: 9,
    publicId: 'article-9',
    localizador: 267960,
    nombre: 'Artículo nuevo',
    referencia: 'REF-9',
    marcaNombre: 'Otra marca',
    stock: 7,
    palbMicros: 800_000,
    pucMicros: 950_000,
    pvpMicros: 1_500_000,
    margenMicroporcentaje: 36_666_667,
    ivaBps: 2100,
    recargoEquivalenciaBps: 520,
    tieneCodigoBarrasAdicional: false,
    observaciones: null,
    mostrarObservacionesPedidos: false,
    ...overrides,
  };
}

describe('purchase-order.component.private', (): void => {
  it('crea un pedido nuevo con los valores iniciales acordados', (): void => {
    const result = createNewPurchaseOrderFormState(true, new Date(2026, 8, 11, 23, 30));

    expect(result).toEqual({
      id: null,
      publicId: null,
      idProveedor: null,
      idTipoPago: null,
      formaPago: null,
      tipo: 'albaran',
      numero: '',
      fechaPedido: '2026-09-11',
      fechaPago: '',
      fechaRecepcionado: null,
      recargoEquivalencia: true,
      europeo: false,
      recepcionado: false,
      observaciones: '',
      columnasVisibles: [1, 5],
    });
  });

  it('convierte una cabecera persistida sin aplicar conversiones horarias', (): void => {
    const result = createExistingPurchaseOrderFormState(
      createPedido({
        fechaPago: '2026-09-12T00:00:00.000Z',
        observaciones: 'Observaciones',
      }),
    );

    expect(result.fechaPedido).toBe('2026-09-10');
    expect(result.fechaPago).toBe('2026-09-12');
    expect(result.numero).toBe('FAC-8');
    expect(result.observaciones).toBe('Observaciones');
    expect(result.columnasVisibles).toEqual([1, 4]);
  });

  it('añade el proveedor histórico cuando no está entre los activos', (): void => {
    const result = buildPurchaseOrderProviderOptions(
      FORM_OPTIONS.proveedores,
      createPedido({
        idProveedor: 9,
        proveedorNombre: 'Proveedor antiguo',
      }),
    );

    expect(result).toEqual([
      {
        idProveedor: 1,
        nombre: 'Proveedor activo',
        historical: false,
      },
      {
        idProveedor: 9,
        nombre: 'Proveedor antiguo',
        historical: true,
      },
    ]);
  });

  it('no duplica un proveedor que sigue activo', (): void => {
    const result = buildPurchaseOrderProviderOptions(FORM_OPTIONS.proveedores, createPedido());

    expect(result).toHaveLength(1);
    expect(result[0]?.historical).toBe(false);
  });

  it('combina formas propias de Compras con los tipos configurables', (): void => {
    const result = buildPurchaseOrderPaymentOptions(FORM_OPTIONS.tiposPago, null);

    expect(result.map((option) => option.label)).toEqual([
      'Domiciliación bancaria',
      'Transferencia bancaria',
      'Tarjeta',
      'Paypal',
    ]);
  });

  it('conserva una forma de pago histórica sin reinterpretarla', (): void => {
    const pedido = createPedido({
      idTipoPago: 10,
      formaPago: 'Tarjeta histórica',
    });

    const options = buildPurchaseOrderPaymentOptions(FORM_OPTIONS.tiposPago, pedido);
    const state = createExistingPurchaseOrderFormState(pedido);

    expect(options.at(-1)).toEqual({
      key: 'historical',
      idTipoPago: 10,
      formaPago: 'Tarjeta histórica',
      label: 'Tarjeta histórica',
      historical: true,
    });
    expect(getPurchaseOrderPaymentKey(state, options)).toBe('historical');
  });

  it('conserva también snapshots legacy que no tenían id_tipo_pago', (): void => {
    const pedido = createPedido({
      idTipoPago: null,
      formaPago: 'Al contado',
    });

    const options = buildPurchaseOrderPaymentOptions(FORM_OPTIONS.tiposPago, pedido);

    expect(options.at(-1)).toMatchObject({
      key: 'historical',
      idTipoPago: null,
      formaPago: 'Al contado',
      historical: true,
    });
  });

  it('selecciona directamente una forma de pago configurable vigente', (): void => {
    const pedido = createPedido({
      idTipoPago: 10,
      formaPago: 'Tarjeta',
    });

    const options = buildPurchaseOrderPaymentOptions(FORM_OPTIONS.tiposPago, pedido);

    expect(getPurchaseOrderPaymentKey(createExistingPurchaseOrderFormState(pedido), options)).toBe(
      'type:10',
    );
  });

  it('valida identificadores de ruta', (): void => {
    expect(parsePurchaseOrderRouteId(null)).toBeNull();
    expect(parsePurchaseOrderRouteId('15')).toBe(15);

    expect(() => parsePurchaseOrderRouteId('0')).toThrow(
      'El identificador del pedido no es válido.',
    );
    expect(() => parsePurchaseOrderRouteId('abc')).toThrow(
      'El identificador del pedido no es válido.',
    );
  });

  it('valida los tres tipos documentales permitidos', (): void => {
    expect(parsePurchaseOrderTipo('albaran')).toBe('albaran');
    expect(parsePurchaseOrderTipo('factura')).toBe('factura');
    expect(parsePurchaseOrderTipo('abono')).toBe('abono');

    expect(() => parsePurchaseOrderTipo('otro')).toThrow(
      'El tipo documental del pedido no es válido.',
    );
  });

  it('normaliza únicamente columnas opcionales conocidas', (): void => {
    expect(normalizePurchaseOrderColumns([1, 4, 4, 999, '5'])).toEqual([1, 4]);

    expect(normalizePurchaseOrderColumns(null)).toEqual([]);
  });

  it('construye y normaliza el comando de guardado de la cabecera', (): void => {
    const state = {
      ...createNewPurchaseOrderFormState(false, new Date(2026, 8, 11)),
      id: 12,
      idProveedor: 4,
      idTipoPago: 10,
      formaPago: '  Tarjeta  ',
      tipo: 'factura' as const,
      numero: '  FAC-100  ',
      fechaPedido: '2026-09-11',
      fechaPago: '   ',
      recargoEquivalencia: true,
      europeo: true,
      observaciones: '  Observación de prueba  ',
      columnasVisibles: [1, 4, 13],
    };

    expect(buildPurchaseOrderSaveCommand(state)).toEqual({
      id: 12,
      idProveedor: 4,
      idTipoPago: 10,
      formaPago: 'Tarjeta',
      tipo: 'factura',
      numero: 'FAC-100',
      fechaPedido: '2026-09-11',
      fechaPago: null,
      recargoEquivalencia: true,
      europeo: true,
      observaciones: 'Observación de prueba',
      columnasVisibles: [1, 4, 13],
    });
  });

  it('rechaza el guardado de un pedido sin proveedor', (): void => {
    const state = createNewPurchaseOrderFormState(false, new Date(2026, 8, 11));

    expect(() => buildPurchaseOrderSaveCommand(state)).toThrow('Debes seleccionar un proveedor.');
  });

  it('mantiene sincronizado el catálogo visual con el contrato backend', (): void => {
    expect(PURCHASE_ORDER_COLUMN_OPTIONS.map((option) => option.id)).toEqual(
      PEDIDO_OPTIONAL_COLUMN_IDS,
    );
  });

  it('incorpora y ordena un proveedor recién creado', (): void => {
    const result = addPurchaseOrderProviderOption(
      [
        {
          idProveedor: 2,
          nombre: 'Beta',
          historical: false,
        },
        {
          idProveedor: 7,
          nombre: 'Proveedor antiguo',
          historical: true,
        },
      ],
      7,
      'Alfa',
    );

    expect(result).toEqual([
      {
        idProveedor: 7,
        nombre: 'Alfa',
        historical: false,
      },
      {
        idProveedor: 2,
        nombre: 'Beta',
        historical: false,
      },
    ]);
  });

  it('convierte una línea persistida al estado editable del renderer', (): void => {
    const result: PurchaseOrderLineState =
      createExistingPurchaseOrderLineState(createPedidoLinea());

    expect(result).toEqual({
      ...createPedidoLinea(),
      key: 'line:20',
    });
  });

  it('crea una línea nueva con unidades cero y stock final inicial sin cambios', (): void => {
    const result: PurchaseOrderLineState = createNewPurchaseOrderLineState(
      createPedidoArticulo(),
      3,
    );

    expect(result).toEqual({
      key: 'article:9',
      id: null,
      publicId: null,
      orden: 3,
      idArticulo: 9,
      localizador: 267960,
      nombreArticulo: 'Artículo nuevo',
      referencia: 'REF-9',
      marcaNombre: 'Otra marca',
      codigoBarras: null,
      unidades: 0,
      stockActual: 7,
      stockFinal: 7,
      palbMicros: 800_000,
      pucMicros: 950_000,
      pvpMicros: 1_500_000,
      margenMicroporcentaje: 36_666_667,
      ivaBps: 2100,
      recargoEquivalenciaBps: 520,
      descuentoBps: 0,
    });
  });

  it('añade un artículo al final respetando el mayor orden existente', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          id: 20,
          orden: 2,
        }),
      ),
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          id: 21,
          publicId: 'order-line-21',
          orden: 5,
          idArticulo: 10,
          localizador: 300000,
        }),
      ),
    ];

    const result: AddPurchaseOrderArticleResult = addPurchaseOrderArticle(
      lines,
      createPedidoArticulo(),
    );

    expect(result.added).toBe(true);
    expect(result.lineKey).toBe('article:9');
    expect(result.lines).toHaveLength(3);
    expect(result.lines[2]?.orden).toBe(6);
    expect(result.lines[2]?.unidades).toBe(0);
  });

  it('no crea una segunda línea cuando el artículo ya está en el pedido', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          idArticulo: 9,
        }),
      ),
    ];

    const result: AddPurchaseOrderArticleResult = addPurchaseOrderArticle(
      lines,
      createPedidoArticulo(),
    );

    expect(result.added).toBe(false);
    expect(result.lines).toBe(lines);
    expect(result.lineKey).toBe('line:20');
  });

  it('detecta también un duplicado legacy mediante localizador', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          idArticulo: null,
          localizador: 267960,
        }),
      ),
    ];

    const result: AddPurchaseOrderArticleResult = addPurchaseOrderArticle(
      lines,
      createPedidoArticulo(),
    );

    expect(result.added).toBe(false);
    expect(result.lines).toBe(lines);
  });

  it('añade una selección múltiple en orden y omite artículos ya existentes', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          idArticulo: 8,
          localizador: 260458,
          orden: 2,
        }),
      ),
    ];

    const result: AddPurchaseOrderArticlesResult = addPurchaseOrderArticles(lines, [
      createPedidoArticulo({
        id: 8,
        publicId: 'article-8',
        localizador: 260458,
      }),
      createPedidoArticulo({
        id: 9,
        publicId: 'article-9',
        localizador: 267960,
      }),
      createPedidoArticulo({
        id: 10,
        publicId: 'article-10',
        localizador: 269395,
      }),
    ]);

    expect(result.lines).toHaveLength(3);

    expect(
      result.lines.map((line: PurchaseOrderLineState): number | null => line.idArticulo),
    ).toEqual([8, 9, 10]);

    expect(result.lines.map((line: PurchaseOrderLineState): number => line.orden)).toEqual([
      2, 3, 4,
    ]);

    expect(result.lines[1]?.unidades).toBe(0);
    expect(result.lines[2]?.unidades).toBe(0);
    expect(result.duplicateLineKey).toBe('line:20');
  });

  it('mantiene el mismo estado cuando toda la selección múltiple ya existe', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          idArticulo: 9,
          localizador: 267960,
        }),
      ),
    ];

    const result: AddPurchaseOrderArticlesResult = addPurchaseOrderArticles(lines, [
      createPedidoArticulo(),
    ]);

    expect(result.lines).toBe(lines);
    expect(result.duplicateLineKey).toBe('line:20');
  });

  it('actualiza las unidades y recalcula el stock final', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          unidades: 4,
          stockActual: 10,
          stockFinal: 14,
        }),
      ),
    ];

    const change: PurchaseOrderLineUnitsChange = {
      lineKey: 'line:20',
      unidades: 7,
    };

    const result: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineUnits(lines, change);

    expect(result).not.toBe(lines);
    expect(result[0]?.unidades).toBe(7);
    expect(result[0]?.stockActual).toBe(10);
    expect(result[0]?.stockFinal).toBe(17);
  });

  it('mantiene stock final desconocido cuando no existe snapshot utilizable', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          stockActual: null,
          stockFinal: null,
        }),
      ),
    ];

    const result: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineUnits(lines, {
      lineKey: 'line:20',
      unidades: 8,
    });

    expect(result[0]?.unidades).toBe(8);
    expect(result[0]?.stockFinal).toBeNull();
  });

  it('permite dejar una línea pendiente con cero unidades', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(
        createPedidoLinea({
          unidades: 4,
          stockActual: 10,
          stockFinal: 14,
        }),
      ),
    ];

    const result: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineUnits(lines, {
      lineKey: 'line:20',
      unidades: 0,
    });

    expect(result[0]?.unidades).toBe(0);
    expect(result[0]?.stockFinal).toBe(10);
  });

  it('rechaza unidades negativas o no enteras', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(createPedidoLinea()),
    ];

    expect(
      updatePurchaseOrderLineUnits(lines, {
        lineKey: 'line:20',
        unidades: -1,
      }),
    ).toBe(lines);

    expect(
      updatePurchaseOrderLineUnits(lines, {
        lineKey: 'line:20',
        unidades: 1.5,
      }),
    ).toBe(lines);
  });

  it('ignora cambios dirigidos a una línea inexistente', (): void => {
    const lines: readonly PurchaseOrderLineState[] = [
      createExistingPurchaseOrderLineState(createPedidoLinea()),
    ];

    expect(
      updatePurchaseOrderLineUnits(lines, {
        lineKey: 'unknown',
        unidades: 10,
      }),
    ).toBe(lines);
  });
});
