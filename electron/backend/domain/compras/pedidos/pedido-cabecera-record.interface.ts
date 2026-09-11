import type { PedidoTipoRecord } from '@backend/domain/compras/pedidos/pedido-listado-record.interface';

export interface PedidoCabeceraRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idProveedor: number;
  readonly proveedorNombre: string;
  readonly idTipoPago: number | null;
  readonly formaPago: string | null;
  readonly tipo: PedidoTipoRecord;
  readonly numero: string | null;
  readonly fechaPedido: string | null;
  readonly fechaPago: string | null;
  readonly fechaRecepcionado: string | null;
  readonly recargoEquivalencia: boolean;
  readonly europeo: boolean;
  readonly recepcionado: boolean;
  readonly observaciones: string | null;
  readonly columnasVisibles: readonly number[];
}

export interface PedidoProveedorOptionRecord {
  readonly idProveedor: number;
  readonly nombre: string;
}

export interface PedidoTipoPagoOptionRecord {
  readonly idTipoPago: number;
  readonly nombre: string;
}

export interface PedidoFormOptionsRecord {
  readonly proveedores: readonly PedidoProveedorOptionRecord[];
  readonly tiposPago: readonly PedidoTipoPagoOptionRecord[];
}

export interface PedidoSaveRecord {
  readonly id: number | null;
  readonly idProveedor: number;
  readonly idTipoPago: number | null;
  readonly formaPago: string | null;
  readonly tipo: PedidoTipoRecord;
  readonly numero: string | null;
  readonly fechaPedido: string | null;
  readonly fechaPago: string | null;
  readonly recargoEquivalencia: boolean;
  readonly europeo: boolean;
  readonly observaciones: string | null;
  readonly columnasVisibles: readonly number[];
}
