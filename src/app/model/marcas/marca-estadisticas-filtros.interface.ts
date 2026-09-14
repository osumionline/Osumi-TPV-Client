import type MarcaEstadisticasTipo from '@model/marcas/marca-estadisticas-tipo.type';

export default interface MarcaEstadisticasFiltros {
  readonly mes: number | 'all';
  readonly anio: number | 'all';
  readonly tipo: MarcaEstadisticasTipo;
}
