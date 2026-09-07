export default interface InventarioRepositoryQuery {
  readonly idProveedor: number | null;
  readonly idMarca: number | null;
  readonly idCategoria: number | null;
  readonly texto: string | null;
  readonly conDescuento: boolean;
  readonly ventasDesde: string;
  readonly offset: number;
  readonly limit: number;
}
