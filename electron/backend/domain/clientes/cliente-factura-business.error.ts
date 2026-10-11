/**
 * Representa una condición de negocio o concurrencia
 * esperable durante una operación de facturación.
 *
 * Estos errores deben llegar a la UX, pero no representan
 * por sí mismos una incidencia técnica persistente.
 */
export default class ClienteFacturaBusinessError extends Error {
  /**
   * Crea el error de negocio conservando opcionalmente
   * la causa que lo haya originado.
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'ClienteFacturaBusinessError';
  }
}
