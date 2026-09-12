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
  readonly tiene_codigo_barras_adicional: number;
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

export interface PedidoArticuloDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly referencia: string | null;
  readonly marca_nombre: string;
  readonly stock: number;
  readonly palb_micros: number;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly margen_microporcentaje: number;
  readonly iva_bps: number;
  readonly re_bps: number;
  readonly tiene_codigo_barras_adicional: number;
  readonly observaciones: string | null;
  readonly mostrar_observaciones_pedidos: number;
}

export const PEDIDO_TIENE_CODIGO_BARRAS_ADICIONAL_SQL: string = `
  EXISTS (
    SELECT 1
    FROM codigo_barras cb_adicional
    WHERE
      cb_adicional.id_articulo = a.id
      AND cb_adicional.por_defecto = 0
      AND cb_adicional.deleted_at IS NULL
  )
`;

export const PEDIDO_ARTICULO_SELECT: string = `
  SELECT
    a.id,
    a.public_id,
    a.localizador,
    a.nombre,
    a.referencia,
    m.nombre AS marca_nombre,
    a.stock,
    a.palb_micros,
    a.puc_micros,
    a.pvp_cents,
    a.margen_microporcentaje,
    a.iva_bps,
    a.re_bps,

    ${PEDIDO_TIENE_CODIGO_BARRAS_ADICIONAL_SQL} AS tiene_codigo_barras_adicional,

    a.observaciones,
    a.mostrar_observaciones_pedidos
  FROM articulo a
  INNER JOIN marca m
    ON m.id = a.id_marca
`;

export interface PedidoLineaIdentityDatabaseRow {
  readonly id: number;
  readonly id_articulo: number | null;
}

export interface PedidoArticuloLineaSnapshotDatabaseRow {
  readonly id: number;
  readonly nombre: string;
}
