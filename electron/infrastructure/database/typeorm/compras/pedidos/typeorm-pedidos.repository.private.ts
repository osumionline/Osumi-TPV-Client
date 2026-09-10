import type { PedidoTipoRecord } from '@backend/domain/compras/pedidos/pedido-listado-record.interface';

export interface PedidoListadoDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly fecha_pedido: string | null;
  readonly fecha_recepcionado: string | null;
  readonly fecha_pago: string | null;
  readonly id_proveedor: number;
  readonly proveedor_nombre: string;
  readonly tipo: PedidoTipoRecord;
  readonly numero: string | null;
  readonly importe_micros: number;
  readonly observaciones: string | null;
  readonly europeo: number;
}

export interface PedidoCountDatabaseRow {
  readonly total_rows: number;
}

export interface PedidoProveedorFilterDatabaseRow {
  readonly id_proveedor: number;
  readonly nombre: string;
}

export interface PedidoSqlFilter {
  readonly clause: string;
  readonly parameters: readonly (number | string)[];
}
