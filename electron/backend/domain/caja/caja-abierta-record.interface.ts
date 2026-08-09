export default interface CajaAbiertaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idTerminal: number;
  readonly apertura: string;
  readonly importeAperturaCents: number;
}
