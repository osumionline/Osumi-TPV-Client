import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, type PageEvent } from '@angular/material/paginator';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import { MatSlideToggle, type MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import type {
  InventarioConsulta,
  InventarioResultado,
  InventarioRowInterface,
} from '@desktop-contracts/almacen/inventario.interface';
import type {
  InventarioDirtyField,
  InventarioDraftEntry,
  InventarioDraftPatch,
  InventarioDraftValues,
  InventarioPriceField,
} from '@model/almacen/inventario-draft.interface';
import InventarioPriceCalculator from '@model/almacen/inventario-price-calculator';
import {
  formatScaledDecimal,
  isTransientScaledDecimalInput,
  parseScaledDecimal,
  rescaleScaledInteger,
} from '@model/articulos/articulo-scaled-decimal.utils';
import type Categoria from '@model/categorias/categoria.model';
import AlmacenService from '@services/almacen.service';
import CategoriasService from '@services/categorias.service';
import MarcasService from '@services/marcas.service';
import ProveedoresService from '@services/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

type InventarioDataColumn =
  | 'localizador'
  | 'proveedor'
  | 'marca'
  | 'referencia'
  | 'categoria'
  | 'nombre'
  | 'stock'
  | 'precioAlbaran'
  | 'puc'
  | 'pvp'
  | 'margen'
  | 'codigoBarras';

type InventarioDisplayedColumn = InventarioDataColumn | 'opciones';

type InventarioKeyboardField = 'stock' | InventarioPriceField | 'codigoBarras';

interface InventarioColumnOption {
  readonly id: InventarioDataColumn;
  readonly label: string;
}

interface InventarioDisplayRow extends InventarioRowInterface {
  readonly draft: InventarioDraftValues;
  readonly dirtyFields: readonly InventarioDirtyField[];
  readonly dirty: boolean;
}

interface InventarioDecimalEditorState {
  readonly idArticulo: number;
  readonly field: InventarioPriceField;
  readonly initialValue: string;
  readonly value: string;
  readonly error: string | null;
}

const INVENTARIO_COLUMN_OPTIONS: readonly InventarioColumnOption[] = [
  {
    id: 'localizador',
    label: 'Localizador',
  },
  {
    id: 'proveedor',
    label: 'Proveedor',
  },
  {
    id: 'marca',
    label: 'Marca',
  },
  {
    id: 'referencia',
    label: 'Referencia',
  },
  {
    id: 'categoria',
    label: 'Categoría',
  },
  {
    id: 'nombre',
    label: 'Nombre',
  },
  {
    id: 'stock',
    label: 'Stock',
  },
  {
    id: 'precioAlbaran',
    label: 'Precio albarán',
  },
  {
    id: 'puc',
    label: 'PUC',
  },
  {
    id: 'pvp',
    label: 'PVP',
  },
  {
    id: 'margen',
    label: 'Margen',
  },
  {
    id: 'codigoBarras',
    label: 'Código de barras',
  },
];

const INVENTARIO_DEFAULT_COLUMNS: readonly InventarioDataColumn[] =
  INVENTARIO_COLUMN_OPTIONS.filter(
    (option: InventarioColumnOption): boolean =>
      option.id !== 'categoria' && option.id !== 'precioAlbaran',
  ).map((option: InventarioColumnOption): InventarioDataColumn => option.id);

const TEXT_SEARCH_DELAY_MS: number = 300;

const PERCENTAGE_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Muestra y filtra el inventario persistido del almacén.
 */
@Component({
  selector: 'otpv-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
  imports: [
    MatButton,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatOption,
    MatPaginator,
    MatSelect,
    MatSlideToggle,
    MatTableModule,
    MatTooltip,
  ],
})
export default class InventoryComponent implements OnInit, OnDestroy {
  readonly almacenService: AlmacenService = inject(AlmacenService);
  readonly categoriasService: CategoriasService = inject(CategoriasService);
  readonly marcasService: MarcasService = inject(MarcasService);
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  private readonly elementRef: ElementRef<HTMLElement> =
    inject<ElementRef<HTMLElement>>(ElementRef);

  readonly idProveedor: WritableSignal<number | null> = signal<number | null>(null);
  readonly idMarca: WritableSignal<number | null> = signal<number | null>(null);
  readonly idCategoria: WritableSignal<number | null> = signal<number | null>(null);
  readonly texto: WritableSignal<string> = signal<string>('');
  readonly conDescuento: WritableSignal<boolean> = signal<boolean>(false);

  readonly pagina: WritableSignal<number> = signal<number>(1);
  readonly num: WritableSignal<number> = signal<number>(20);
  readonly pageSizeOptions: readonly number[] = [20, 50, 100, 200];

  readonly rows: WritableSignal<readonly InventarioRowInterface[]> = signal<
    readonly InventarioRowInterface[]
  >([]);
  readonly totalRows: WritableSignal<number> = signal<number>(0);
  readonly mediaMargenMicroporcentaje: WritableSignal<number> = signal<number>(0);
  readonly totalPucMicros: WritableSignal<number> = signal<number>(0);
  readonly totalPvpCents: WritableSignal<number> = signal<number>(0);

  readonly drafts: WritableSignal<ReadonlyMap<number, InventarioDraftEntry>> = signal<
    ReadonlyMap<number, InventarioDraftEntry>
  >(new Map<number, InventarioDraftEntry>());

  readonly activeResultFilterKey: WritableSignal<string | null> = signal<string | null>(null);

  readonly editingDecimalCell: WritableSignal<InventarioDecimalEditorState | null> =
    signal<InventarioDecimalEditorState | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly columnOptions: readonly InventarioColumnOption[] = INVENTARIO_COLUMN_OPTIONS;
  readonly selectedColumns: WritableSignal<readonly InventarioDataColumn[]> = signal<
    readonly InventarioDataColumn[]
  >(INVENTARIO_DEFAULT_COLUMNS);

  readonly displayedColumns: Signal<readonly InventarioDisplayedColumn[]> = computed(
    (): readonly InventarioDisplayedColumn[] => [...this.selectedColumns(), 'opciones'],
  );

  private readonly categoriasById: Signal<ReadonlyMap<number, string>> = computed(
    (): ReadonlyMap<number, string> => {
      const result: Map<number, string> = new Map<number, string>();

      for (const categoria of this.categoriasService.categoriasPlain()) {
        if (categoria.id !== null) {
          result.set(categoria.id, categoria.nombre);
        }
      }

      return result;
    },
  );

  readonly displayRows: Signal<readonly InventarioDisplayRow[]> = computed(
    (): readonly InventarioDisplayRow[] => {
      const drafts: ReadonlyMap<number, InventarioDraftEntry> = this.drafts();

      return this.rows().map((row: InventarioRowInterface): InventarioDisplayRow => {
        const entry: InventarioDraftEntry | undefined = drafts.get(row.id);
        const draft: InventarioDraftValues = entry?.draft ?? this.createDraftValues(row);
        const dirtyFields: readonly InventarioDirtyField[] =
          entry === undefined ? [] : this.getDirtyFields(entry);

        return {
          ...row,
          draft,
          dirtyFields,
          dirty: dirtyFields.length > 0,
        };
      });
    },
  );

  readonly liveMediaMargenMicroporcentaje: Signal<number> = computed((): number => {
    const totalRows: number = this.totalRows();

    if (totalRows === 0) {
      return 0;
    }

    let marginSum: number = this.mediaMargenMicroporcentaje() * totalRows;

    for (const entry of this.getDraftEntriesForCurrentResult()) {
      marginSum += entry.draft.margenMicroporcentaje - entry.snapshot.margenMicroporcentaje;
    }

    return marginSum / totalRows;
  });

  readonly liveTotalPucMicros: Signal<number> = computed((): number => {
    let total: number = this.totalPucMicros();

    for (const entry of this.getDraftEntriesForCurrentResult()) {
      total +=
        entry.draft.stock * entry.draft.pucMicros - entry.snapshot.stock * entry.snapshot.pucMicros;
    }

    return total;
  });

  readonly liveTotalPvpCents: Signal<number> = computed((): number => {
    let total: number = this.totalPvpCents();

    for (const entry of this.getDraftEntriesForCurrentResult()) {
      total +=
        entry.draft.stock * entry.draft.pvpCents - entry.snapshot.stock * entry.snapshot.pvpCents;
    }

    return total;
  });

  private requestSequence: number = 0;
  private textSearchTimeoutId: number | null = null;
  private destroyed: boolean = false;

  /**
   * Carga los catálogos y la primera página de Inventario.
   */
  ngOnInit(): void {
    void this.initialize();
  }

  /**
   * Cancela temporizadores y respuestas pendientes al destruir el componente.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestSequence++;
    this.clearTextSearchTimeout();
  }

  /**
   * Aplica el filtro de proveedor.
   */
  onProveedorChange(event: MatSelectChange): void {
    const value: unknown = event.value;
    const idProveedor: number | null | undefined = this.parseOptionalId(value);

    if (idProveedor === undefined) {
      return;
    }

    this.idProveedor.set(idProveedor);
    this.resetPageAndLoad();
  }

  /**
   * Aplica el filtro de marca.
   */
  onMarcaChange(event: MatSelectChange): void {
    const value: unknown = event.value;
    const idMarca: number | null | undefined = this.parseOptionalId(value);

    if (idMarca === undefined) {
      return;
    }

    this.idMarca.set(idMarca);
    this.resetPageAndLoad();
  }

  /**
   * Aplica el filtro exacto de categoría.
   */
  onCategoriaChange(event: MatSelectChange): void {
    const value: unknown = event.value;
    const idCategoria: number | null | undefined = this.parseOptionalId(value);

    if (idCategoria === undefined) {
      return;
    }

    this.idCategoria.set(idCategoria);
    this.resetPageAndLoad();
  }

  /**
   * Actualiza el texto libre y programa una búsqueda remota.
   */
  onTextoInput(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.texto.set(input.value);
    this.pagina.set(1);
    this.clearTextSearchTimeout();

    this.textSearchTimeoutId = window.setTimeout((): void => {
      this.textSearchTimeoutId = null;
      void this.loadInventario();
    }, TEXT_SEARCH_DELAY_MS);
  }

  /**
   * Activa o desactiva el filtro de artículos con descuento.
   */
  onDescuentoChange(event: MatSlideToggleChange): void {
    this.conDescuento.set(event.checked);
    this.resetPageAndLoad();
  }

  /**
   * Cambia las columnas de datos visibles preservando su orden canónico.
   */
  onColumnsChange(event: MatSelectChange): void {
    const value: unknown = event.value;

    if (!Array.isArray(value)) {
      return;
    }

    const rawColumns: readonly unknown[] = value as readonly unknown[];
    const selected: Set<InventarioDataColumn> = new Set<InventarioDataColumn>();

    for (const column of rawColumns) {
      if (this.isInventarioDataColumn(column)) {
        selected.add(column);
      }
    }

    this.selectedColumns.set(
      INVENTARIO_COLUMN_OPTIONS.filter((option: InventarioColumnOption): boolean =>
        selected.has(option.id),
      ).map((option: InventarioColumnOption): InventarioDataColumn => option.id),
    );
  }

  /**
   * Solicita otra página del conjunto filtrado.
   */
  onPageChange(event: PageEvent): void {
    this.clearTextSearchTimeout();

    this.pagina.set(event.pageIndex + 1);
    this.num.set(event.pageSize);

    void this.loadInventario();
  }

  /**
   * Reintenta la carga completa después de un error.
   */
  retry(): void {
    void this.initialize();
  }

  /**
   * Devuelve el texto jerárquico de una categoría del selector.
   */
  formatCategoriaOption(categoria: Categoria): string {
    const depth: number = Math.max(0, categoria.profundidad - 1);

    return `${'— '.repeat(depth)}${categoria.nombre}`;
  }

  /**
   * Devuelve los nombres de las categorías explícitas del artículo.
   */
  formatCategorias(idsCategorias: readonly number[]): string {
    if (idsCategorias.length === 0) {
      return '—';
    }

    const categories: ReadonlyMap<number, string> = this.categoriasById();

    return idsCategorias
      .map((idCategoria: number): string => categories.get(idCategoria) ?? `#${idCategoria}`)
      .join(', ');
  }

  /**
   * Formatea microeuros como importe monetario.
   */
  formatMicros(value: number): string {
    return `${formatScaledDecimal(rescaleScaledInteger(value, 6, 2), 2, 2)} €`;
  }

  /**
   * Formatea céntimos como importe monetario.
   */
  formatCents(value: number): string {
    return `${formatScaledDecimal(value, 2, 2)} €`;
  }

  /**
   * Formatea un porcentaje almacenado en millonésimas.
   *
   * Se admite un valor decimal porque SQLite AVG puede devolver
   * una media no entera aunque los márgenes individuales sí lo sean.
   */
  formatMargin(value: number): string {
    return `${PERCENTAGE_FORMATTER.format(value / 1_000_000)} %`;
  }

  /**
   * Carga los catálogos reutilizados por los filtros y después Inventario.
   */
  private async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.proveedoresService.load(),
        this.marcasService.load(),
        this.categoriasService.load(),
      ]);
    } catch (error: unknown) {
      if (this.destroyed) {
        return;
      }

      this.clearResult();
      this.error.set(
        getErrorMessage(error, 'No se han podido cargar los datos necesarios del inventario.'),
      );
      this.loading.set(false);

      return;
    }

    if (this.destroyed) {
      return;
    }

    await this.loadInventario();
  }

  /**
   * Recupera del backend la página correspondiente a los filtros actuales.
   */
  private async loadInventario(): Promise<void> {
    const requestId: number = ++this.requestSequence;

    this.loading.set(true);
    this.error.set(null);

    const consulta: InventarioConsulta = {
      idProveedor: this.idProveedor(),
      idMarca: this.idMarca(),
      idCategoria: this.idCategoria(),
      texto: this.texto(),
      conDescuento: this.conDescuento(),
      pagina: this.pagina(),
      num: this.num(),
    };
    const filterKey: string = this.buildFilterKey(consulta);

    try {
      const result: InventarioResultado = await this.almacenService.searchInventario(consulta);

      if (requestId !== this.requestSequence || this.destroyed) {
        return;
      }

      this.reconcileDrafts(result.rows, filterKey);
      this.rows.set(result.rows);
      this.activeResultFilterKey.set(filterKey);
      this.totalRows.set(result.totalRows);
      this.mediaMargenMicroporcentaje.set(result.mediaMargenMicroporcentaje);
      this.totalPucMicros.set(result.totalPucMicros);
      this.totalPvpCents.set(result.totalPvpCents);
    } catch (error: unknown) {
      if (requestId !== this.requestSequence || this.destroyed) {
        return;
      }

      this.clearResult();
      this.error.set(getErrorMessage(error, 'No se ha podido cargar el inventario.'));
    } finally {
      if (requestId === this.requestSequence && !this.destroyed) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Vuelve a la primera página y refresca el resultado.
   */
  private resetPageAndLoad(): void {
    this.clearTextSearchTimeout();
    this.pagina.set(1);

    void this.loadInventario();
  }

  /**
   * Convierte el valor de un selector en un id opcional válido.
   */
  private parseOptionalId(value: unknown): number | null | undefined {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
      return undefined;
    }

    return value;
  }

  /**
   * Comprueba que un valor pertenece al conjunto de columnas seleccionables.
   */
  private isInventarioDataColumn(value: unknown): value is InventarioDataColumn {
    if (typeof value !== 'string') {
      return false;
    }

    return INVENTARIO_COLUMN_OPTIONS.some(
      (option: InventarioColumnOption): boolean => option.id === value,
    );
  }

  /**
   * Limpia filas y agregados después de un error.
   */
  private clearResult(): void {
    this.rows.set([]);
    this.totalRows.set(0);
    this.mediaMargenMicroporcentaje.set(0);
    this.totalPucMicros.set(0);
    this.totalPvpCents.set(0);
    this.activeResultFilterKey.set(null);
  }

  /**
   * Cancela la búsqueda textual pendiente.
   */
  private clearTextSearchTimeout(): void {
    if (this.textSearchTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.textSearchTimeoutId);
    this.textSearchTimeoutId = null;
  }

  /**
   * Actualiza las categorías explícitas del draft.
   */
  onRowCategoriasChange(event: MatSelectChange, idArticulo: number): void {
    const value: unknown = event.value;

    if (!Array.isArray(value)) {
      return;
    }

    const idsCategorias: number[] = value
      .filter(
        (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0,
      )
      .filter(
        (id: number, index: number, values: readonly number[]): boolean =>
          values.indexOf(id) === index,
      )
      .sort((a: number, b: number): number => a - b);

    this.updateDraft(idArticulo, {
      idsCategorias,
    });
  }

  /**
   * Selecciona todo el contenido de un input al recibir foco.
   */
  selectInputContent(event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    inputElement.select();
  }

  /**
   * Confirma el stock cuando el editor pierde el foco.
   */
  onStockBlur(event: FocusEvent, idArticulo: number): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.commitStockInput(inputElement, idArticulo);
  }

  /**
   * Confirma el stock y avanza a la fila inferior al pulsar Intro.
   */
  onStockEnter(event: Event, idArticulo: number): void {
    event.preventDefault();

    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    if (!this.commitStockInput(inputElement, idArticulo)) {
      return;
    }

    this.focusNextEditor(idArticulo, 'stock');
  }

  /**
   * Valida y aplica el stock escrito por el usuario.
   */
  private commitStockInput(inputElement: HTMLInputElement, idArticulo: number): boolean {
    const entry: InventarioDraftEntry | undefined = this.drafts().get(idArticulo);

    if (entry === undefined) {
      return false;
    }

    const rawValue: number = inputElement.valueAsNumber;

    if (!Number.isFinite(rawValue)) {
      inputElement.value = String(entry.draft.stock);

      return false;
    }

    const stock: number = Math.trunc(rawValue);

    if (!Number.isSafeInteger(stock)) {
      inputElement.value = String(entry.draft.stock);

      return false;
    }

    inputElement.value = String(stock);

    if (entry.draft.stock === stock) {
      return true;
    }

    this.updateDraft(idArticulo, {
      stock,
    });

    return true;
  }

  /**
   * Inicia la edición de un precio y selecciona todo su contenido.
   */
  onPriceFocus(event: FocusEvent, idArticulo: number, field: InventarioPriceField): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.editingDecimalCell.set({
      idArticulo,
      field,
      initialValue: inputElement.value,
      value: inputElement.value,
      error: null,
    });

    inputElement.select();
  }

  /**
   * Conserva y valida el texto de un precio mientras el usuario escribe.
   */
  onPriceInput(event: Event, row: InventarioDisplayRow, field: InventarioPriceField): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;
    const rawValue: string = this.limitDecimalFraction(inputElement.value, 2);

    if (rawValue !== inputElement.value) {
      inputElement.value = rawValue;
    }

    const current: InventarioDecimalEditorState | null = this.editingDecimalCell();

    this.editingDecimalCell.set({
      idArticulo: row.id,
      field,
      initialValue:
        current !== null && current.idArticulo === row.id && current.field === field
          ? current.initialValue
          : rawValue,
      value: rawValue,
      error: null,
    });

    if (isTransientScaledDecimalInput(rawValue)) {
      return;
    }

    if (this.parsePriceValue(field, rawValue) === null) {
      this.setDecimalError(row.id, field, 'El precio no es válido.');
    }
  }

  /**
   * Confirma el precio cuando el editor pierde el foco.
   */
  onPriceBlur(event: FocusEvent, row: InventarioDisplayRow, field: InventarioPriceField): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.commitPriceInput(inputElement, row, field);
    this.editingDecimalCell.set(null);
  }

  /**
   * Confirma el precio y avanza a la fila inferior al pulsar Intro.
   */
  onPriceEnter(event: Event, row: InventarioDisplayRow, field: InventarioPriceField): void {
    event.preventDefault();

    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    if (!this.commitPriceInput(inputElement, row, field)) {
      return;
    }

    this.editingDecimalCell.set(null);
    this.focusNextEditor(row.id, field);
  }

  /**
   * Valida un precio y aplica su cascada si el usuario lo ha modificado.
   */
  private commitPriceInput(
    inputElement: HTMLInputElement,
    row: InventarioDisplayRow,
    field: InventarioPriceField,
  ): boolean {
    const rawValue: string = this.limitDecimalFraction(inputElement.value, 2);
    const editor: InventarioDecimalEditorState | null = this.editingDecimalCell();

    if (
      editor !== null &&
      editor.idArticulo === row.id &&
      editor.field === field &&
      this.sameVisiblePriceValue(rawValue, editor.initialValue)
    ) {
      return true;
    }

    if (isTransientScaledDecimalInput(rawValue)) {
      this.setDecimalError(row.id, field, 'El precio no es válido.');

      return false;
    }

    const value: number | null = this.parsePriceValue(field, rawValue);

    if (value === null) {
      this.setDecimalError(row.id, field, 'El precio no es válido.');

      return false;
    }

    try {
      this.applyPriceChange(row, field, value);

      return true;
    } catch (error: unknown) {
      this.setDecimalError(
        row.id,
        field,
        getErrorMessage(error, 'No se ha podido recalcular el precio.'),
      );

      return false;
    }
  }

  /**
   * Comprueba si dos textos representan el mismo precio visible.
   */
  private sameVisiblePriceValue(first: string, second: string): boolean {
    const firstValue: number | null = parseScaledDecimal(first, 2);
    const secondValue: number | null = parseScaledDecimal(second, 2);

    return firstValue !== null && secondValue !== null && firstValue === secondValue;
  }

  /**
   * Obtiene el texto que debe mostrar un editor de precio.
   */
  getPriceInputValue(row: InventarioDisplayRow, field: InventarioPriceField): string {
    const editingCell: InventarioDecimalEditorState | null = this.editingDecimalCell();

    if (editingCell !== null && editingCell.idArticulo === row.id && editingCell.field === field) {
      return editingCell.value;
    }

    switch (field) {
      case 'precioAlbaran':
        return formatScaledDecimal(rescaleScaledInteger(row.draft.precioAlbaranMicros, 6, 2), 2, 2);

      case 'puc':
        return formatScaledDecimal(rescaleScaledInteger(row.draft.pucMicros, 6, 2), 2, 2);

      case 'pvp':
        return formatScaledDecimal(row.draft.pvpCents, 2, 2);
    }
  }

  /**
   * Indica si el editor decimal actual contiene un error.
   */
  hasDecimalError(idArticulo: number, field: InventarioPriceField): boolean {
    const editingCell: InventarioDecimalEditorState | null = this.editingDecimalCell();

    return (
      editingCell !== null &&
      editingCell.idArticulo === idArticulo &&
      editingCell.field === field &&
      editingCell.error !== null
    );
  }

  /**
   * Obtiene el error del editor decimal actual.
   */
  getDecimalError(idArticulo: number, field: InventarioPriceField): string | null {
    const editingCell: InventarioDecimalEditorState | null = this.editingDecimalCell();

    if (
      editingCell === null ||
      editingCell.idArticulo !== idArticulo ||
      editingCell.field !== field
    ) {
      return null;
    }

    return editingCell.error;
  }
  /**
   * Convierte el texto monetario a la escala interna correspondiente.
   */
  private parsePriceValue(field: InventarioPriceField, value: string): number | null {
    const scaledValue: number | null = parseScaledDecimal(value, 2);

    if (scaledValue === null || scaledValue < 0) {
      return null;
    }

    return field === 'pvp' ? scaledValue : rescaleScaledInteger(scaledValue, 2, 6);
  }

  /**
   * Aplica la cascada de cálculo correspondiente al precio editado.
   */
  private applyPriceChange(
    row: InventarioDisplayRow,
    field: InventarioPriceField,
    value: number,
  ): void {
    if (this.isSamePriceValue(row, field, value)) {
      return;
    }

    let patch: InventarioDraftPatch;

    switch (field) {
      case 'precioAlbaran':
        patch = InventarioPriceCalculator.actualizarPrecioAlbaran(
          row.draft,
          row.ivaBps,
          row.reBps,
          value,
        );
        break;

      case 'puc':
        patch = InventarioPriceCalculator.actualizarPuc(row.draft, row.ivaBps, row.reBps, value);
        break;

      case 'pvp':
        patch = InventarioPriceCalculator.actualizarPvp(row.draft, value);
        break;
    }

    this.updateDraft(row.id, patch);
  }

  /**
   * Comprueba si el precio recibido coincide con el valor actual del draft.
   */
  private isSamePriceValue(
    row: InventarioDisplayRow,
    field: InventarioPriceField,
    value: number,
  ): boolean {
    switch (field) {
      case 'precioAlbaran':
        return row.draft.precioAlbaranMicros === value;

      case 'puc':
        return row.draft.pucMicros === value;

      case 'pvp':
        return row.draft.pvpCents === value;
    }
  }

  /**
   * Limita visualmente un decimal a la precisión utilizada por Inventario.
   */
  private limitDecimalFraction(value: string, maxFractionDigits: number): string {
    const match: RegExpMatchArray | null = value.match(/^([+-]?\d*)([.,])(\d*)$/);

    if (match === null || match[3].length <= maxFractionDigits) {
      return value;
    }

    return `${match[1]}${match[2]}${match[3].slice(0, maxFractionDigits)}`;
  }

  /**
   * Establece un error sobre el editor decimal activo.
   */
  private setDecimalError(idArticulo: number, field: InventarioPriceField, error: string): void {
    const editingCell: InventarioDecimalEditorState | null = this.editingDecimalCell();

    if (
      editingCell === null ||
      editingCell.idArticulo !== idArticulo ||
      editingCell.field !== field
    ) {
      return;
    }

    this.editingDecimalCell.set({
      ...editingCell,
      error,
    });
  }

  /**
   * Confirma el código adicional al perder el foco.
   */
  onBarcodeBlur(event: FocusEvent, idArticulo: number): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.commitBarcodeInput(inputElement, idArticulo);
  }

  /**
   * Confirma el código y avanza al siguiente editor disponible.
   */
  onBarcodeEnter(event: Event, idArticulo: number): void {
    event.preventDefault();

    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    if (!this.commitBarcodeInput(inputElement, idArticulo)) {
      return;
    }

    this.focusNextEditor(idArticulo, 'codigoBarras');
  }

  /**
   * Aplica al draft el código adicional escrito.
   */
  private commitBarcodeInput(inputElement: HTMLInputElement, idArticulo: number): boolean {
    const entry: InventarioDraftEntry | undefined = this.drafts().get(idArticulo);

    if (entry === undefined) {
      return false;
    }

    const codigoAdicional: string = inputElement.value;

    if (entry.draft.codigoAdicional === codigoAdicional) {
      return true;
    }

    this.updateDraft(idArticulo, {
      codigoAdicional,
    });

    return true;
  }

  /**
   * Restaura una fila completa a su snapshot persistido.
   */
  resetRow(idArticulo: number): void {
    const entry: InventarioDraftEntry | undefined = this.drafts().get(idArticulo);

    if (entry === undefined) {
      return;
    }

    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      this.drafts(),
    );

    drafts.set(idArticulo, {
      ...entry,
      draft: this.cloneDraftValues(entry.snapshot),
    });

    this.drafts.set(drafts);

    const editingCell: InventarioDecimalEditorState | null = this.editingDecimalCell();

    if (editingCell?.idArticulo === idArticulo) {
      this.editingDecimalCell.set(null);
    }
  }

  /**
   * Crea los valores editables iniciales a partir de una fila persistida.
   */
  private createDraftValues(row: InventarioRowInterface): InventarioDraftValues {
    return {
      idsCategorias: [...row.idsCategorias].sort((a: number, b: number): number => a - b),
      stock: row.stock,
      precioAlbaranMicros: row.precioAlbaranMicros,
      pucMicros: row.pucMicros,
      pvpCents: row.pvpCents,
      margenMicroporcentaje: row.margenMicroporcentaje,
      codigoAdicional: '',
    };
  }

  /**
   * Copia los valores editables sin compartir arrays.
   */
  private cloneDraftValues(values: InventarioDraftValues): InventarioDraftValues {
    return {
      ...values,
      idsCategorias: [...values.idsCategorias],
    };
  }

  /**
   * Incorpora las filas recién cargadas al espacio local de drafts.
   */
  private reconcileDrafts(rows: readonly InventarioRowInterface[], filterKey: string): void {
    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      this.drafts(),
    );

    for (const row of rows) {
      const current: InventarioDraftEntry | undefined = drafts.get(row.id);
      const persistedValues: InventarioDraftValues = this.createDraftValues(row);

      if (current === undefined) {
        drafts.set(row.id, {
          snapshot: persistedValues,
          draft: this.cloneDraftValues(persistedValues),
          filterKeys: [filterKey],
        });

        continue;
      }

      const filterKeys: readonly string[] = current.filterKeys.includes(filterKey)
        ? current.filterKeys
        : [...current.filterKeys, filterKey];

      if (this.getDirtyFields(current).length === 0) {
        drafts.set(row.id, {
          snapshot: persistedValues,
          draft: this.cloneDraftValues(persistedValues),
          filterKeys,
        });

        continue;
      }

      drafts.set(row.id, {
        ...current,
        filterKeys,
      });
    }

    this.drafts.set(drafts);
  }

  /**
   * Aplica un cambio parcial a una fila local.
   */
  private updateDraft(idArticulo: number, patch: InventarioDraftPatch): void {
    const current: InventarioDraftEntry | undefined = this.drafts().get(idArticulo);

    if (current === undefined) {
      return;
    }

    const drafts: Map<number, InventarioDraftEntry> = new Map<number, InventarioDraftEntry>(
      this.drafts(),
    );

    drafts.set(idArticulo, {
      ...current,
      draft: {
        ...current.draft,
        ...patch,
        idsCategorias:
          patch.idsCategorias === undefined
            ? current.draft.idsCategorias
            : [...patch.idsCategorias],
      },
    });

    this.drafts.set(drafts);
  }

  /**
   * Obtiene las celdas modificadas de una fila.
   */
  private getDirtyFields(entry: InventarioDraftEntry): readonly InventarioDirtyField[] {
    const dirty: InventarioDirtyField[] = [];

    if (!this.sameIds(entry.snapshot.idsCategorias, entry.draft.idsCategorias)) {
      dirty.push('categoria');
    }

    if (entry.snapshot.stock !== entry.draft.stock) {
      dirty.push('stock');
    }

    if (entry.snapshot.precioAlbaranMicros !== entry.draft.precioAlbaranMicros) {
      dirty.push('precioAlbaran');
    }

    if (entry.snapshot.pucMicros !== entry.draft.pucMicros) {
      dirty.push('puc');
    }

    if (entry.snapshot.pvpCents !== entry.draft.pvpCents) {
      dirty.push('pvp');
    }

    if (entry.snapshot.margenMicroporcentaje !== entry.draft.margenMicroporcentaje) {
      dirty.push('margen');
    }

    if (entry.draft.codigoAdicional.trim().length > 0) {
      dirty.push('codigoBarras');
    }

    return dirty;
  }

  /**
   * Compara dos selecciones de categorías normalizadas.
   */
  private sameIds(first: readonly number[], second: readonly number[]): boolean {
    return (
      first.length === second.length &&
      first.every((id: number, index: number): boolean => id === second[index])
    );
  }

  /**
   * Obtiene los drafts conocidos como pertenecientes al filtro mostrado.
   */
  private getDraftEntriesForCurrentResult(): readonly InventarioDraftEntry[] {
    const filterKey: string | null = this.activeResultFilterKey();

    if (filterKey === null) {
      return [];
    }

    return [...this.drafts().values()].filter((entry: InventarioDraftEntry): boolean =>
      entry.filterKeys.includes(filterKey),
    );
  }

  /**
   * Crea una clave estable para identificar el conjunto filtrado.
   */
  private buildFilterKey(consulta: InventarioConsulta): string {
    return JSON.stringify([
      consulta.idProveedor,
      consulta.idMarca,
      consulta.idCategoria,
      consulta.texto.trim(),
      consulta.conDescuento,
    ]);
  }

  /**
   * Conserva la identidad DOM de cada fila aunque cambie su draft.
   */
  trackByArticulo(_index: number, row: InventarioDisplayRow): number {
    return row.id;
  }

  /**
   * Tras confirmar una celda, enfoca el mismo editor de la siguiente fila.
   */
  private focusNextEditor(idArticulo: number, field: InventarioKeyboardField): void {
    window.requestAnimationFrame((): void => {
      if (this.destroyed) {
        return;
      }

      const rows: readonly InventarioDisplayRow[] = this.displayRows();
      const currentIndex: number = rows.findIndex(
        (row: InventarioDisplayRow): boolean => row.id === idArticulo,
      );

      if (currentIndex < 0) {
        return;
      }

      for (let index: number = currentIndex + 1; index < rows.length; index++) {
        const nextRow: InventarioDisplayRow | undefined = rows[index];

        if (nextRow === undefined) {
          continue;
        }

        const input: HTMLInputElement | null =
          this.elementRef.nativeElement.querySelector<HTMLInputElement>(
            `input[data-inventory-row-id="${nextRow.id}"][data-inventory-field="${field}"]`,
          );

        if (input === null) {
          continue;
        }

        input.focus();
        input.select();

        return;
      }
    });
  }
}
