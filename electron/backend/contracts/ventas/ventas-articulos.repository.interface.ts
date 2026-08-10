import type {
  AccesoDirectoVentaRecord,
  ArticuloVentaRecord,
} from '@backend/domain/ventas/articulo-venta-record.interface';

export default interface VentasArticulosRepository {
  resolveByCode(codigo: string, codigoNumerico: number | null): Promise<ArticuloVentaRecord | null>;

  search(searchPattern: string): Promise<readonly ArticuloVentaRecord[]>;

  getAccesosDirectos(): Promise<readonly AccesoDirectoVentaRecord[]>;
}
