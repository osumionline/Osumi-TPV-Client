import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';

export default interface VentasApi {
  getContext(): Promise<VentasContextInterface>;
}
