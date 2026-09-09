import {
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import {
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import type { ImprentaArticuloSearchInterface } from '@desktop-contracts/almacen/imprenta-articulo.interface';
import ImprentaDesignItem from '@model/almacen/imprenta-design-item.interface';
import { DialogService } from '@osumi/angular-tools';
import AlmacenService from '@services/almacen.service';
import { getErrorMessage } from '@utils/error.utils';

const SEARCH_DELAY_MS: number = 250;

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Contenedor del diseñador efímero de etiquetas de Imprenta.
 */
@Component({
  selector: 'otpv-imprenta',
  templateUrl: './imprenta.component.html',
  styleUrl: './imprenta.component.scss',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    MatButton,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatTooltip,
  ],
})
export default class ImprentaComponent implements OnDestroy {
  readonly almacenService: AlmacenService = inject(AlmacenService);
  private readonly dialog: DialogService = inject(DialogService);
  readonly query: WritableSignal<string> = signal<string>('');
  readonly results: WritableSignal<readonly ImprentaArticuloSearchInterface[]> = signal<
    readonly ImprentaArticuloSearchInterface[]
  >([]);
  readonly searchLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchError: WritableSignal<string | null> = signal<string | null>(null);
  readonly designItems: WritableSignal<readonly ImprentaDesignItem[]> = signal<
    readonly ImprentaDesignItem[]
  >([]);
  readonly selectedArticleIds: Signal<readonly number[]> = computed((): readonly number[] =>
    this.designItems().flatMap((item: ImprentaDesignItem): readonly number[] =>
      item.articulo === null ? [] : [item.articulo.id],
    ),
  );
  readonly totalDesignSlots: Signal<number> = computed((): number =>
    this.designItems().reduce(
      (total: number, item: ImprentaDesignItem): number => total + item.cantidad,
      0,
    ),
  );
  private searchTimeoutId: number | null = null;
  private searchSequence: number = 0;
  private nextGapId: number = 1;
  private destroyed: boolean = false;

  /**
   * Cancela búsquedas pendientes al destruir el diseñador.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.searchSequence++;
    this.clearSearchTimeout();
  }

  /**
   * Programa la búsqueda remota según el texto escrito.
   */
  onSearchInput(event: Event): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.query.set(inputElement.value);
    this.searchError.set(null);
    this.clearSearchTimeout();

    const texto: string = inputElement.value.trim();

    if (texto.length === 0) {
      this.searchSequence++;
      this.results.set([]);
      this.searchLoading.set(false);

      return;
    }

    this.searchTimeoutId = window.setTimeout((): void => {
      this.searchTimeoutId = null;
      void this.search(texto);
    }, SEARCH_DELAY_MS);
  }

  /**
   * Incorpora un artículo al diseño con una etiqueta
   * inicial y lo retira de los resultados visibles.
   */
  selectArticle(article: ImprentaArticuloSearchInterface): void {
    if (this.selectedArticleIds().includes(article.id)) {
      return;
    }

    const item: ImprentaDesignItem = {
      id: `articulo-${article.id}`,
      tipo: 'articulo',
      articulo: article,
      cantidad: 1,
    };

    this.designItems.update(
      (items: readonly ImprentaDesignItem[]): readonly ImprentaDesignItem[] => [...items, item],
    );

    this.searchSequence++;
    this.searchLoading.set(false);
    this.results.update(
      (
        results: readonly ImprentaArticuloSearchInterface[],
      ): readonly ImprentaArticuloSearchInterface[] =>
        results.filter(
          (result: ImprentaArticuloSearchInterface): boolean => result.id !== article.id,
        ),
    );
  }

  /**
   * Añade una única posición vacía al diseño.
   */
  addGap(): void {
    const item: ImprentaDesignItem = {
      id: `hueco-${this.nextGapId++}`,
      tipo: 'hueco',
      articulo: null,
      cantidad: 1,
    };

    this.designItems.update(
      (items: readonly ImprentaDesignItem[]): readonly ImprentaDesignItem[] => [...items, item],
    );
  }

  /**
   * Confirma una cantidad entera positiva para
   * un artículo seleccionado.
   */
  onQuantityChange(event: Event, item: ImprentaDesignItem): void {
    if (item.articulo === null) {
      return;
    }

    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const value: number = Number(inputElement.value);

    if (!Number.isSafeInteger(value) || value < 1) {
      inputElement.value = String(item.cantidad);

      return;
    }

    if (value === item.cantidad) {
      return;
    }

    this.designItems.update((items: readonly ImprentaDesignItem[]): readonly ImprentaDesignItem[] =>
      items.map((current: ImprentaDesignItem): ImprentaDesignItem =>
        current.id === item.id
          ? {
              ...current,
              cantidad: value,
            }
          : current,
      ),
    );
  }

  /**
   * Reordena los bloques del diseño mediante drag & drop.
   */
  dropDesignItem(event: CdkDragDrop<readonly ImprentaDesignItem[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const items: ImprentaDesignItem[] = [...this.designItems()];

    moveItemInArray(items, event.previousIndex, event.currentIndex);
    this.designItems.set(items);
  }

  /**
   * Elimina un hueco directamente o solicita
   * confirmación si se trata de un artículo.
   */
  removeItem(item: ImprentaDesignItem): void {
    if (item.articulo === null) {
      this.removeDesignItem(item);

      return;
    }

    this.dialog
      .confirm({
        title: 'Quitar artículo',
        content: `¿Quieres quitar "${item.articulo.nombre}" del diseño de etiquetas?`,
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.removeDesignItem(item);
      });
  }

  /**
   * Retira un elemento del diseñador y refresca
   * el buscador si vuelve a estar disponible un artículo.
   */
  private removeDesignItem(item: ImprentaDesignItem): void {
    this.designItems.update((items: readonly ImprentaDesignItem[]): readonly ImprentaDesignItem[] =>
      items.filter((current: ImprentaDesignItem): boolean => current.id !== item.id),
    );

    if (item.articulo !== null) {
      this.refreshCurrentSearch();
    }
  }

  /**
   * Solicita confirmación antes de vaciar
   * completamente el contenido del diseño.
   */
  clearDesign(): void {
    if (this.designItems().length === 0) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Limpiar diseño',
        content:
          '¿Quieres quitar todos los artículos y huecos del diseño? La configuración de impresión se conservará.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.designItems.set([]);
        this.refreshCurrentSearch();
      });
  }

  /**
   * Repite la búsqueda visible utilizando
   * las exclusiones actuales del diseñador.
   */
  private refreshCurrentSearch(): void {
    this.clearSearchTimeout();

    const texto: string = this.query().trim();

    if (texto.length === 0) {
      this.searchSequence++;
      this.results.set([]);
      this.searchLoading.set(false);

      return;
    }

    void this.search(texto);
  }

  /**
   * Formatea un PVP almacenado en céntimos.
   */
  formatCents(value: number): string {
    return CURRENCY_FORMATTER.format(value / 100);
  }

  /**
   * Ejecuta una búsqueda remota y descarta respuestas obsoletas.
   */
  private async search(texto: string): Promise<void> {
    const requestId: number = ++this.searchSequence;

    this.searchLoading.set(true);
    this.searchError.set(null);

    try {
      const results: readonly ImprentaArticuloSearchInterface[] =
        await this.almacenService.searchImprentaArticulos({
          texto,
          idsArticulosExcluidos: this.selectedArticleIds(),
        });

      if (this.destroyed || requestId !== this.searchSequence) {
        return;
      }

      this.results.set(results);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.searchSequence) {
        return;
      }

      this.results.set([]);
      this.searchError.set(
        getErrorMessage(error, 'No se han podido buscar artículos para Imprenta.'),
      );
    } finally {
      if (!this.destroyed && requestId === this.searchSequence) {
        this.searchLoading.set(false);
      }
    }
  }

  /**
   * Cancela el debounce de búsqueda pendiente.
   */
  private clearSearchTimeout(): void {
    if (this.searchTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.searchTimeoutId);
    this.searchTimeoutId = null;
  }
}
