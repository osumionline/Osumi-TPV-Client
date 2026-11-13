/**
 * Comunicación con un backend de tienda online compatible
 * con el protocolo de sincronización del TPV.
 */
export default interface TiendaOnlinePedidosClient {
  /**
   * Recupera una página de pedidos posteriores al cursor.
   * La respuesta externa se valida en la capa de aplicación.
   */
  pending(afterId: number): Promise<unknown>;

  /**
   * Confirma que un pedido ha sido incorporado.
   *
   * Este método no debe llamarse hasta que la orquestación
   * comercial y fiscal establezca que procede el ACK.
   */
  acknowledge(orderId: number): Promise<void>;
}
