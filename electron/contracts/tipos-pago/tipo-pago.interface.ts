export default interface TipoPagoInterface {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly foto: string | null;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly fisico: boolean;
}
