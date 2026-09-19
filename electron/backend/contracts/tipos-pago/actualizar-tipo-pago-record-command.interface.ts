import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

export default interface ActualizarTipoPagoRecordCommand {
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly fisico: boolean;

  /**
   * Nuevo logo preparado para sustituir el actual.
   *
   * null significa conservar el logo persistido.
   * Un Tipo de pago configurable no puede quedarse
   * voluntariamente sin logo.
   */
  readonly nuevoLogo: ArchivoCreateRecord | null;
}
