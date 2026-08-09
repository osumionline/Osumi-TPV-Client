export default interface CategoriaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idPadre: number | null;
  readonly nombre: string;
  readonly orden: number;
}
