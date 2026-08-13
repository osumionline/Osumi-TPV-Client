import type VentaVariosData from '@model/ventas/venta-varios-data.interface';

export default interface VentaVariosEditorState {
  readonly lineaIdTemporal: string | null;
  readonly data: VentaVariosData;
}
