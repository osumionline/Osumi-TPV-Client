import type PedidoLineaSaveCommand from '@desktop-contracts/compras/pedidos/pedido-linea-save.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';

export interface PedidoCabeceraInterface {
  readonly id: number;
  readonly publicId: string;
  readonly idProveedor: number;
  readonly proveedorNombre: string;
  readonly idTipoPago: number | null;
  readonly formaPago: string | null;
  readonly tipo: PedidoTipo;
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

export interface PedidoProveedorOptionInterface {
  readonly idProveedor: number;
  readonly nombre: string;
}

export interface PedidoTipoPagoOptionInterface {
  readonly idTipoPago: number;
  readonly nombre: string;
}

export interface PedidoFormOptionsInterface {
  readonly proveedores: readonly PedidoProveedorOptionInterface[];
  readonly tiposPago: readonly PedidoTipoPagoOptionInterface[];
}

export interface PedidoSaveCommand {
  readonly id: number | null;
  readonly idProveedor: number;
  readonly idTipoPago: number | null;
  readonly formaPago: string | null;
  readonly tipo: PedidoTipo;
  readonly numero: string | null;
  readonly fechaPedido: string | null;
  readonly fechaPago: string | null;
  readonly recargoEquivalencia: boolean;
  readonly europeo: boolean;
  readonly observaciones: string | null;
  readonly columnasVisibles: readonly number[];
  readonly lineas: readonly PedidoLineaSaveCommand[];
}
