export type PedidoTipo = 'albaran' | 'factura' | 'abono';

export interface PedidoListadoConsulta {
  readonly fechaDesde: string | null;
  readonly fechaHasta: string | null;
  readonly idProveedor: number | null;
  readonly numero: string;
  readonly importeDesdeMicros: number | null;
  readonly importeHastaMicros: number | null;
  readonly pagina: number;
  readonly num: number;
}

export interface PedidoGuardadoRowInterface {
  readonly id: number;
  readonly publicId: string;
  readonly fechaPedido: string | null;
  readonly idProveedor: number;
  readonly proveedorNombre: string;
  readonly tipo: PedidoTipo;
  readonly numero: string | null;
  readonly importeMicros: number;
  readonly observaciones: string | null;
}

export interface PedidoRecepcionadoRowInterface extends PedidoGuardadoRowInterface {
  readonly fechaRecepcionado: string | null;
  readonly fechaPago: string | null;
  readonly europeo: boolean;
}

export interface PedidosGuardadosResultado {
  readonly rows: readonly PedidoGuardadoRowInterface[];
  readonly totalRows: number;
}

export interface PedidosRecepcionadosResultado {
  readonly rows: readonly PedidoRecepcionadoRowInterface[];
  readonly totalRows: number;
}

export interface PedidoProveedorFilterInterface {
  readonly idProveedor: number;
  readonly nombre: string;
}

export interface PedidoFilterOptionsInterface {
  readonly proveedores: readonly PedidoProveedorFilterInterface[];
}
