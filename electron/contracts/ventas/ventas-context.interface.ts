import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type TerminalInterface from '@desktop-contracts/terminales/terminal.interface';
import type TipoPagoInterface from '@desktop-contracts/tipos-pago/tipo-pago.interface';

export default interface VentasContextInterface {
  readonly appData: AppData;
  readonly terminal: TerminalInterface;
  readonly cajaAbierta: CajaAbiertaInterface | null;
  readonly tiposPago: readonly TipoPagoInterface[];
}
