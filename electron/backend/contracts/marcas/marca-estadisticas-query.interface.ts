import type { MarcaEstadisticasTipo } from '@desktop-contracts/compras/marcas/marca-estadisticas.interface';

export default interface MarcaEstadisticasRepositoryQuery {
  readonly idMarca: number;
  readonly metric: MarcaEstadisticasTipo;
  readonly year: number | null;
  readonly month: number | null;
}
