import { DatePipe } from '@angular/common';
import {
  Component,
  inject,
  input,
  OnInit,
  signal,
  type InputSignal,
  type WritableSignal,
} from '@angular/core';
import { MatPaginator, type PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader, type Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import type {
  ArticuloHistoricoItem,
  ArticuloHistoricoResultado,
  ArticuloHistoricoSortDirection,
  ArticuloHistoricoSortField,
} from '@desktop-contracts/articulos/articulo-historico.interface';
import {
  formatScaledDecimal,
  rescaleScaledInteger,
} from '@model/articulos/articulo-scaled-decimal.utils';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticulosService from '@services/articulos.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra el histórico persistido de movimientos de un artículo.
 */
@Component({
  selector: 'otpv-article-history',
  templateUrl: './article-history.component.html',
  styleUrl: './article-history.component.scss',
  imports: [DatePipe, MatPaginator, MatSort, MatSortHeader, MatTableModule],
})
export default class ArticleHistoryComponent implements OnInit {
  private readonly articulosService: ArticulosService = inject(ArticulosService);
  private requestSequence: number = 0;

  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly items: WritableSignal<readonly ArticuloHistoricoItem[]> = signal<
    readonly ArticuloHistoricoItem[]
  >([]);
  readonly total: WritableSignal<number> = signal<number>(0);
  readonly pagina: WritableSignal<number> = signal<number>(1);
  readonly num: WritableSignal<number> = signal<number>(20);
  readonly orderBy: WritableSignal<ArticuloHistoricoSortField> =
    signal<ArticuloHistoricoSortField>('createdAt');
  readonly orderDirection: WritableSignal<ArticuloHistoricoSortDirection> =
    signal<ArticuloHistoricoSortDirection>('desc');
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly displayedColumns: readonly string[] = [
    'createdAt',
    'tipo',
    'stockPrevio',
    'diferencia',
    'stockFinal',
    'pucMicros',
    'pvpMicros',
    'idVenta',
    'idPedido',
  ];
  readonly pageSizeOptions: number[] = [20, 50, 100, 200];

  /**
   * Carga la primera página cuando el artículo ya está persistido.
   */
  ngOnInit(): void {
    if (this.tab().draft.id !== null) {
      void this.load();
    }
  }

  /**
   * Cambia el orden remoto del histórico.
   */
  onSortChange(sort: Sort): void {
    if (!this.isSortField(sort.active) || (sort.direction !== 'asc' && sort.direction !== 'desc')) {
      return;
    }

    this.orderBy.set(sort.active);
    this.orderDirection.set(sort.direction);
    this.pagina.set(1);

    void this.load();
  }

  /**
   * Cambia la página o su tamaño y solicita los datos correspondientes.
   */
  onPageChange(event: PageEvent): void {
    this.pagina.set(event.pageIndex + 1);
    this.num.set(event.pageSize);

    void this.load();
  }

  /**
   * Obtiene la etiqueta legible de un tipo histórico.
   */
  formatTipo(tipo: number): string {
    switch (tipo) {
      case 1:
        return 'Venta';

      case 2:
        return 'Venta (web)';

      case 3:
        return 'Pedido';

      case 4:
        return 'Manual';

      case 5:
        return 'Inventario';

      case 6:
        return 'Inventario (múltiple)';

      default:
        return `Tipo ${tipo}`;
    }
  }

  /**
   * Formatea un importe histórico almacenado en microeuros.
   */
  formatMicros(value: number): string {
    return formatScaledDecimal(rescaleScaledInteger(value, 6, 2), 2, 2);
  }

  /**
   * Recupera del backend la página correspondiente al estado actual.
   */
  private async load(): Promise<void> {
    const idArticulo: number | null = this.tab().draft.id;

    if (idArticulo === null) {
      this.items.set([]);
      this.total.set(0);
      return;
    }

    const requestId: number = ++this.requestSequence;

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: ArticuloHistoricoResultado = await this.articulosService.getHistorico({
        idArticulo,
        pagina: this.pagina(),
        num: this.num(),
        orderBy: this.orderBy(),
        orderDirection: this.orderDirection(),
      });

      if (requestId !== this.requestSequence) {
        return;
      }

      this.items.set(result.items);
      this.total.set(result.total);
    } catch (error: unknown) {
      if (requestId !== this.requestSequence) {
        return;
      }

      this.items.set([]);
      this.total.set(0);
      this.error.set(getErrorMessage(error, 'No se ha podido cargar el histórico del artículo.'));
    } finally {
      if (requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Comprueba que una columna pertenece a las permitidas por la API.
   */
  private isSortField(value: string): value is ArticuloHistoricoSortField {
    switch (value) {
      case 'createdAt':
      case 'tipo':
      case 'stockPrevio':
      case 'diferencia':
      case 'stockFinal':
      case 'pucMicros':
      case 'pvpMicros':
      case 'idVenta':
      case 'idPedido':
        return true;

      default:
        return false;
    }
  }
}
