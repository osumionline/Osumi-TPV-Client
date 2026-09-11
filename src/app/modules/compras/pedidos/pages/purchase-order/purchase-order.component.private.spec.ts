import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import { PEDIDO_OPTIONAL_COLUMN_IDS } from '@desktop-contracts/compras/pedidos/pedido-columnas.constants';
import { describe, expect, it } from 'vitest';
import {
  buildPurchaseOrderPaymentOptions,
  buildPurchaseOrderProviderOptions,
  createExistingPurchaseOrderFormState,
  createNewPurchaseOrderFormState,
  getPurchaseOrderPaymentKey,
  normalizePurchaseOrderColumns,
  parsePurchaseOrderRouteId,
  parsePurchaseOrderTipo,
  PURCHASE_ORDER_COLUMN_OPTIONS,
} from './purchase-order.component.private';

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

  it('mantiene sincronizado el catálogo visual con el contrato backend', (): void => {
    expect(PURCHASE_ORDER_COLUMN_OPTIONS.map((option) => option.id)).toEqual(
      PEDIDO_OPTIONAL_COLUMN_IDS,
    );
  });
});
