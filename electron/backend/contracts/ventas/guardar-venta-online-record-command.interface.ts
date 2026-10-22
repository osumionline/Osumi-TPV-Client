import type {
  GuardarVentaLineaRecordCommand,
  GuardarVentaPagoRecordCommand,
} from '@backend/contracts/ventas/guardar-venta-record-command.interface';

/**
 * Venta pagada en una tienda online y preparada
 * para su persistencia en el TPV.
 *
 * Los importes y las líneas deben haberse validado
 * y normalizado antes de construir este comando.
 */
export default interface GuardarVentaOnlineRecordCommand {
  readonly publicId: string;
  readonly referenciaExterna: string;
  readonly pagadaAt: string;

  readonly totalCents: number;
  readonly lineas: readonly GuardarVentaLineaRecordCommand[];
  readonly pagos: readonly GuardarVentaPagoRecordCommand[];
}
