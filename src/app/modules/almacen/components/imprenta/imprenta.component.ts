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
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { QRCodeComponent } from 'angularx-qrcode';
import {
  IMPRENTA_DEFAULT_COLUMNS,
  IMPRENTA_DEFAULT_ORIENTATION,
  IMPRENTA_DEFAULT_ROWS,
  IMPRENTA_DEFAULT_SHOW_PVP,
  IMPRENTA_MAX_COLUMNS,
  IMPRENTA_MAX_ROWS,
  type ImprentaOrientation,
  type ImprentaPrintCommand,
  type ImprentaPrintItemCommand,
} from '@desktop-contracts/almacen/imprenta-print.interface';

const SEARCH_DELAY_MS: number = 250;

type ImprentaPreviewSlotType = 'articulo' | 'hueco' | 'libre';

interface ImprentaPreviewSlot {
  readonly id: string;
  readonly tipo: ImprentaPreviewSlotType;
  readonly articulo: ImprentaArticuloSearchInterface | null;
}

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
    MatButtonToggle,
    MatButtonToggleGroup,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatSlideToggle,
    MatTooltip,
    QRCodeComponent,
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
  readonly rows: WritableSignal<number> = signal<number>(IMPRENTA_DEFAULT_ROWS);
  readonly columns: WritableSignal<number> = signal<number>(IMPRENTA_DEFAULT_COLUMNS);
  readonly orientation: WritableSignal<ImprentaOrientation> = signal<ImprentaOrientation>(
    IMPRENTA_DEFAULT_ORIENTATION,
  );
  readonly showPvp: WritableSignal<boolean> = signal<boolean>(IMPRENTA_DEFAULT_SHOW_PVP);
  readonly finishOpening: WritableSignal<boolean> = signal<boolean>(false);
  readonly finishError: WritableSignal<string | null> = signal<string | null>(null);
  readonly hasArticle: Signal<boolean> = computed((): boolean =>
    this.designItems().some((item: ImprentaDesignItem): boolean => item.articulo !== null),
  );
  readonly canFinish: Signal<boolean> = computed(
    (): boolean =>
      this.hasArticle() &&
      this.designItems().length > 0 &&
      !this.capacityExceeded() &&
      !this.finishOpening(),
  );
  readonly maxRows: number = IMPRENTA_MAX_ROWS;
  readonly maxColumns: number = IMPRENTA_MAX_COLUMNS;

  readonly capacity: Signal<number> = computed((): number => this.rows() * this.columns());
  readonly remainingCapacity: Signal<number> = computed((): number =>
    Math.max(0, this.capacity() - this.totalDesignSlots()),
  );
  readonly capacityExceeded: Signal<boolean> = computed(
    (): boolean => this.totalDesignSlots() > this.capacity(),
  );
  readonly canAddDesignItem: Signal<boolean> = computed(
    (): boolean => !this.capacityExceeded() && this.totalDesignSlots() < this.capacity(),
  );
  readonly capacityError: Signal<string | null> = computed((): string | null => {
    const total: number = this.totalDesignSlots();
    const capacity: number = this.capacity();

    if (total <= capacity) {
      return null;
    }

    const excess: number = total - capacity;

    return (
      `El diseño ocupa ${total} posiciones, pero la hoja solo admite ${capacity}. ` +
      `Sobran ${excess} ${excess === 1 ? 'posición' : 'posiciones'}.`
    );
  });
  readonly previewSlots: Signal<readonly ImprentaPreviewSlot[]> = computed(
    (): readonly ImprentaPreviewSlot[] => this.createPreviewSlots(),
  );
  readonly previewQrWidth: Signal<number> = computed((): number => this.calculatePreviewQrWidth());
  readonly densePreview: Signal<boolean> = computed(
    (): boolean => Math.max(this.rows(), this.columns()) >= 7,
  );
  readonly veryDensePreview: Signal<boolean> = computed(
    (): boolean => Math.max(this.rows(), this.columns()) >= 9,
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
    if (this.selectedArticleIds().includes(article.id) || !this.canAddDesignItem()) {
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
    if (!this.canAddDesignItem()) {
      return;
    }

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

    const nextTotal: number = this.totalDesignSlots() - item.cantidad + value;

    if (nextTotal > this.capacity() && value > item.cantidad) {
      inputElement.value = String(item.cantidad);

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
   * Calcula la cantidad máxima que puede ocupar
   * un artículo con la configuración actual.
   */
  maxQuantityForItem(item: ImprentaDesignItem): number {
    const usedByOthers: number = this.totalDesignSlots() - item.cantidad;

    return Math.max(1, this.capacity() - usedByOthers);
  }

  /**
   * Confirma el número de filas de la hoja.
   */
  onRowsChange(event: Event): void {
    this.updateDimension(event, this.rows, IMPRENTA_MAX_ROWS);
  }

  /**
   * Confirma el número de columnas de la hoja.
   */
  onColumnsChange(event: Event): void {
    this.updateDimension(event, this.columns, IMPRENTA_MAX_COLUMNS);
  }

  /**
   * Cambia la orientación de la hoja A4.
   */
  setOrientation(value: unknown): void {
    if (value !== 'portrait' && value !== 'landscape') {
      return;
    }

    this.orientation.set(value);
  }

  /**
   * Activa o desactiva el PVP en las etiquetas.
   */
  setShowPvp(value: boolean): void {
    this.showPvp.set(value);
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
   * Convierte el localizador al contenido textual del QR.
   */
  formatQrData(localizador: number): string {
    return String(localizador);
  }

  /**
   * Construye el comando mínimo del diseño y abre
   * su snapshot canónico en una ventana independiente.
   */
  async finishDesign(): Promise<void> {
    if (!this.canFinish()) {
      return;
    }

    this.finishOpening.set(true);
    this.finishError.set(null);

    try {
      const items: readonly ImprentaPrintItemCommand[] = this.designItems().map(
        (item: ImprentaDesignItem): ImprentaPrintItemCommand =>
          item.articulo === null
            ? {
                tipo: 'hueco',
              }
            : {
                tipo: 'articulo',
                idArticulo: item.articulo.id,
                cantidad: item.cantidad,
              },
      );

      const command: ImprentaPrintCommand = {
        filas: this.rows(),
        columnas: this.columns(),
        orientacion: this.orientation(),
        mostrarPvp: this.showPvp(),
        items,
      };

      await this.almacenService.openImprentaPrint(command);
    } catch (error: unknown) {
      this.finishError.set(
        getErrorMessage(error, 'No se ha podido preparar la hoja de etiquetas.'),
      );
    } finally {
      this.finishOpening.set(false);
    }
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

  /**
   * Valida y confirma una dimensión entera de la hoja.
   */
  private updateDimension(event: Event, target: WritableSignal<number>, maximum: number): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const previousValue: number = target();
    const value: number = Number(inputElement.value);

    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
      inputElement.value = String(previousValue);

      return;
    }

    target.set(value);
  }

  /**
   * Expande artículos y huecos a las posiciones
   * físicas visibles de la hoja.
   */
  private createPreviewSlots(): readonly ImprentaPreviewSlot[] {
    const occupiedSlots: ImprentaPreviewSlot[] = [];

    for (const item of this.designItems()) {
      if (item.articulo === null) {
        occupiedSlots.push({
          id: item.id,
          tipo: 'hueco',
          articulo: null,
        });

        continue;
      }

      for (let index: number = 0; index < item.cantidad; index++) {
        occupiedSlots.push({
          id: `${item.id}-${index}`,
          tipo: 'articulo',
          articulo: item.articulo,
        });
      }
    }

    const visibleSlots: ImprentaPreviewSlot[] = occupiedSlots.slice(0, this.capacity());

    while (visibleSlots.length < this.capacity()) {
      visibleSlots.push({
        id: `libre-${visibleSlots.length}`,
        tipo: 'libre',
        articulo: null,
      });
    }

    return visibleSlots;
  }

  /**
   * Calcula un QR conservador para que la
   * previsualización siga funcionando en rejillas densas.
   */
  private calculatePreviewQrWidth(): number {
    const previewWidth: number = 400;
    const previewHeight: number =
      this.orientation() === 'portrait' ? previewWidth * (297 / 210) : previewWidth * (210 / 297);
    const cellWidth: number = previewWidth / this.columns();
    const cellHeight: number = previewHeight / this.rows();

    return Math.max(16, Math.min(56, Math.floor(Math.min(cellWidth * 0.36, cellHeight * 0.7))));
  }
}
