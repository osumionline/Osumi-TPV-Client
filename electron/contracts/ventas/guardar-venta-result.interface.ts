export default interface GuardarVentaResult {
  readonly id: number;
  readonly publicId: string;

  readonly serie: string;
  readonly numero: number;

  readonly totalCents: number;
  readonly fecha: string;
}
