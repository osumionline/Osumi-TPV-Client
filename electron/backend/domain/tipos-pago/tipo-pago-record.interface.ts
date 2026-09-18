export default interface TipoPagoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly fotoRelativePath: string | null;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly fisico: boolean;
}
