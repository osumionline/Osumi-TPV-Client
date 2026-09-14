import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';

/**
 * Crea los filtros estadísticos iniciales utilizando
 * el mes y el año actuales.
 */
export function createMarcaEstadisticasFiltrosIniciales(
  now: Date = new Date(),
): MarcaEstadisticasFiltros {
  return {
    mes: now.getMonth() + 1,
    anio: now.getFullYear(),
    tipo: 'amount',
  };
}

/**
 * Normaliza los filtros asegurando que Año = Todos
 * implique también Mes = Todos.
 */
export function normalizeMarcaEstadisticasFiltros(
  filters: MarcaEstadisticasFiltros,
): MarcaEstadisticasFiltros {
  validateMarcaEstadisticasFiltros(filters);

  if (filters.anio === 'all') {
    return {
      ...filters,
      mes: 'all',
    };
  }

  return {
    ...filters,
  };
}

/**
 * Comprueba que los filtros estadísticos contienen
 * únicamente valores admitidos por la ficha de Marca.
 */
function validateMarcaEstadisticasFiltros(filters: MarcaEstadisticasFiltros): void {
  if (
    filters.mes !== 'all' &&
    (!Number.isSafeInteger(filters.mes) || filters.mes < 1 || filters.mes > 12)
  ) {
    throw new Error('El mes indicado para las estadísticas no es válido.');
  }

  if (filters.anio !== 'all' && (!Number.isSafeInteger(filters.anio) || filters.anio <= 0)) {
    throw new Error('El año indicado para las estadísticas no es válido.');
  }

  if (filters.tipo !== 'amount' && filters.tipo !== 'units') {
    throw new Error('El tipo indicado para las estadísticas no es válido.');
  }
}
