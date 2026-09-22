export default interface CajaCierreTipoPagoModel {
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly operaciones: number;
  readonly importeVentasCents: number;
  readonly importeRealCents: number | null;
  readonly expanded: boolean;
}
