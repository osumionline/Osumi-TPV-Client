/**
 * Identifica el recurso físico asociado a una
 * relación de PDF de Pedido.
 */
export interface PedidoArchivoResourceRecord {
  readonly archivoPublicId: string;
}

/**
 * Describe el resultado lógico de eliminar una
 * relación de PDF de Pedido.
 */
export interface PedidoArchivoDeleteResultRecord extends PedidoArchivoResourceRecord {
  readonly removePhysicalFile: boolean;
}
