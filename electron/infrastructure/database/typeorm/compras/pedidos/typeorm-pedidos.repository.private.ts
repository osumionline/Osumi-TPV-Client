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

export interface PedidoCabeceraDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_proveedor: number;
  readonly proveedor_nombre: string;
  readonly id_tipo_pago: number | null;
  readonly forma_pago: string | null;
  readonly tipo: PedidoTipoRecord;
  readonly numero: string | null;
  readonly fecha_pedido: string | null;
  readonly fecha_pago: string | null;
  readonly fecha_recepcionado: string | null;
  readonly recargo_equivalencia: number;
  readonly europeo: number;
  readonly recepcionado: number;
  readonly observaciones: string | null;
}

export interface PedidoTipoPagoOptionDatabaseRow {
  readonly id_tipo_pago: number;
  readonly nombre: string;
}

export interface PedidoVisibleColumnDatabaseRow {
  readonly id_columna: number;
}

export interface PedidoCurrentStateDatabaseRow {
  readonly id_proveedor: number;
  readonly id_tipo_pago: number | null;
  readonly forma_pago: string | null;
  readonly recargo_equivalencia: number;
  readonly recepcionado: number;
}

export interface DatabaseIdRow {
  readonly id: number;
}

export interface PedidoLineaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly orden: number;
  readonly id_articulo: number | null;
  readonly localizador: number | null;
  readonly nombre_articulo: string;
  readonly referencia: string | null;
  readonly marca_nombre: string | null;
  readonly codigo_barras: string | null;
  readonly unidades: number;
  readonly stock_actual: number | null;
  readonly stock_final: number | null;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_micros: number;
  readonly margen_microporcentaje: number;
  readonly iva_bps: number;
  readonly recargo_equivalencia_bps: number;
  readonly descuento_bps: number;
}
