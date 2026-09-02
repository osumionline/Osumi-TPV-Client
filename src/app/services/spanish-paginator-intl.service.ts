import { Service } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

/**
 * Traduce al castellano los textos comunes de MatPaginator.
 */
@Service()
export default class SpanishPaginatorIntlService extends MatPaginatorIntl {
  override itemsPerPageLabel: string = 'Elementos por página:';
  override nextPageLabel: string = 'Página siguiente';
  override previousPageLabel: string = 'Página anterior';
  override firstPageLabel: string = 'Primera página';
  override lastPageLabel: string = 'Última página';

  /**
   * Muestra el rango de elementos de la página actual.
   */
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }

    const startIndex: number = page * pageSize;
    const endIndex: number = Math.min(startIndex + pageSize, length);

    return `${startIndex + 1} – ${endIndex} de ${length}`;
  };
}
