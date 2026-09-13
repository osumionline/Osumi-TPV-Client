/**
 * Abstrae la selección nativa de un PDF de Pedido.
 */
export default interface PedidoArchivoDialog {
  selectPdf(): Promise<string | null>;
}
