export default interface SalidaCajaRecord {
  readonly publicId: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importeCents: number;
  readonly fecha: string;
  readonly editable: boolean;
}
