import {
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
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
import {
  formatScaledDecimal,
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

interface InventarioColumnOption {
  readonly id: InventarioDataColumn;
  readonly label: string;
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

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly columnOptions: readonly InventarioColumnOption[] = INVENTARIO_COLUMN_OPTIONS;
  readonly selectedColumns: WritableSignal<readonly InventarioDataColumn[]> = signal<
    readonly InventarioDataColumn[]
  >(
    INVENTARIO_COLUMN_OPTIONS.map(
      (option: InventarioColumnOption): InventarioDataColumn => option.id,
    ),
  );

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

    try {
      const result: InventarioResultado = await this.almacenService.searchInventario(consulta);

      if (requestId !== this.requestSequence || this.destroyed) {
        return;
      }

      this.rows.set(result.rows);
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
}
