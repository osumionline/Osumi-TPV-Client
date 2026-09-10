export type PedidoTipoRecord = 'albaran' | 'factura' | 'abono';

export interface PedidoGuardadoRowRecord {
  readonly id: number;
  readonly publicId: string;
  readonly fechaPedido: string | null;
  readonly idProveedor: number;
  readonly proveedorNombre: string;
  readonly tipo: PedidoTipoRecord;
  readonly numero: string | null;
  readonly importeMicros: number;
  readonly observaciones: string | null;
}

export interface PedidoRecepcionadoRowRecord extends PedidoGuardadoRowRecord {
  readonly fechaRecepcionado: string | null;
  readonly fechaPago: string | null;
  readonly europeo: boolean;
}

export interface PedidosGuardadosResultadoRecord {
  readonly rows: readonly PedidoGuardadoRowRecord[];
  readonly totalRows: number;
}

export interface PedidosRecepcionadosResultadoRecord {
  readonly rows: readonly PedidoRecepcionadoRowRecord[];
  readonly totalRows: number;
}

export interface PedidoProveedorFilterRecord {
  readonly idProveedor: number;
  readonly nombre: string;
}

export interface PedidoFilterOptionsRecord {
  readonly proveedores: readonly PedidoProveedorFilterRecord[];
}
