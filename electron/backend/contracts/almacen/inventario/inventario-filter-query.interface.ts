export default interface InventarioFilterQuery {
  readonly idProveedor: number | null;
  readonly idMarca: number | null;
  readonly idCategoria: number | null;
  readonly texto: string | null;
  readonly conDescuento: boolean;
}
