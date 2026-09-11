import { CurrencyPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  Signal,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ComprasService from '@services/compras.service';
import VentasArticulosService from '@services/ventas-articulos.service';
import { getErrorMessage } from '@utils/error.utils';

interface ArticleSearchResult {
  readonly publicId: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly marca: string;
  readonly precioMicros: number;
  readonly stock: number;
  readonly ventaArticulo: ArticuloVenta | null;
  readonly pedidoArticulo: PedidoArticuloInterface | null;
}

/**
 * Busca artículos para seleccionar uno o varios
 * desde los distintos módulos de la aplicación.
 */
@Component({
  selector: 'otpv-article-search',
  templateUrl: './article-search.component.html',
  styleUrl: './article-search.component.scss',
  imports: [CurrencyPipe, MatButton, MatIcon, MicrosToEurosPipe],
})
export default class ArticleSearchComponent implements OnInit, OnDestroy {
  private readonly ventasArticulosService: VentasArticulosService = inject(VentasArticulosService);
  private readonly comprasService: ComprasService = inject(ComprasService);

  private searchTimeoutId: number | null = null;
  private searchVersion: number = 0;

  private readonly searchInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly initialQuery: InputSignal<string> = input<string>('');

  readonly context: InputSignal<'ventas' | 'articulos' | 'pedidos'> = input<
    'ventas' | 'articulos' | 'pedidos'
  >('ventas');

  readonly selectEvent: OutputEmitterRef<readonly ArticuloVenta[]> =
    output<readonly ArticuloVenta[]>();
  readonly pedidoSelectEvent: OutputEmitterRef<readonly PedidoArticuloInterface[]> =
    output<readonly PedidoArticuloInterface[]>();
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');
  readonly results: WritableSignal<readonly ArticleSearchResult[]> = signal<
    readonly ArticleSearchResult[]
  >([]);
  readonly selectedPublicIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  constructor() {
    afterNextRender((): void => {
      this.searchInput().nativeElement.focus();
    });
  }

  /**
   * Ejecuta la primera búsqueda utilizando el texto recibido.
   */
  ngOnInit(): void {
    this.query.set(this.initialQuery());
    void this.search();
  }

  /**
   * Cancela la búsqueda pendiente al destruir el componente.
   */
  ngOnDestroy(): void {
    if (this.searchTimeoutId !== null) {
      window.clearTimeout(this.searchTimeoutId);
    }
  }

  /**
   * Actualiza el texto y programa una nueva búsqueda.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);

    if (this.searchTimeoutId !== null) {
      window.clearTimeout(this.searchTimeoutId);
    }

    this.searchTimeoutId = window.setTimeout((): void => {
      void this.search();
    }, 150);
  }

  /**
   * Marca o desmarca un artículo de la selección múltiple.
   */
  toggleArticulo(articulo: ArticleSearchResult): void {
    const selectedPublicIds: Set<string> = new Set<string>(this.selectedPublicIds());

    if (selectedPublicIds.has(articulo.publicId)) {
      selectedPublicIds.delete(articulo.publicId);
    } else {
      selectedPublicIds.add(articulo.publicId);
    }

    this.selectedPublicIds.set(selectedPublicIds);
  }

  /**
   * Selecciona inmediatamente un único artículo.
   */
  selectArticulo(articulo: ArticleSearchResult): void {
    if (this.context() === 'pedidos') {
      if (articulo.pedidoArticulo !== null) {
        this.pedidoSelectEvent.emit([articulo.pedidoArticulo]);
      }

      return;
    }

    if (articulo.ventaArticulo !== null) {
      this.selectEvent.emit([articulo.ventaArticulo]);
    }
  }

  /**
   * Devuelve al módulo consumidor los artículos seleccionados.
   */
  confirm(): void {
    const selectedPublicIds: ReadonlySet<string> = this.selectedPublicIds();

    const selectedResults: readonly ArticleSearchResult[] = this.results().filter(
      (articulo: ArticleSearchResult): boolean => selectedPublicIds.has(articulo.publicId),
    );

    if (selectedResults.length === 0) {
      return;
    }

    if (this.context() === 'pedidos') {
      const selected: readonly PedidoArticuloInterface[] = selectedResults
        .map(
          (articulo: ArticleSearchResult): PedidoArticuloInterface | null =>
            articulo.pedidoArticulo,
        )
        .filter(
          (articulo: PedidoArticuloInterface | null): articulo is PedidoArticuloInterface =>
            articulo !== null,
        );

      if (selected.length > 0) {
        this.pedidoSelectEvent.emit(selected);
      }

      return;
    }

    const selected: readonly ArticuloVenta[] = selectedResults
      .map((articulo: ArticleSearchResult): ArticuloVenta | null => articulo.ventaArticulo)
      .filter((articulo: ArticuloVenta | null): articulo is ArticuloVenta => articulo !== null);

    if (selected.length > 0) {
      this.selectEvent.emit(selected);
    }
  }

  /**
   * Cierra el buscador sin seleccionar artículos.
   */
  close(): void {
    this.closeEvent.emit();
  }

  /**
   * Consulta los artículos que coinciden con el texto actual
   * utilizando la fuente correspondiente al contexto.
   */
  private async search(): Promise<void> {
    const currentVersion: number = ++this.searchVersion;

    this.loading.set(true);
    this.error.set(null);

    try {
      const results: readonly ArticleSearchResult[] =
        this.context() === 'pedidos'
          ? (await this.comprasService.searchPedidoArticulos(this.query())).map(
              (articulo: PedidoArticuloInterface): ArticleSearchResult =>
                this.mapPedidoArticulo(articulo),
            )
          : (await this.ventasArticulosService.search(this.query())).map(
              (articulo: ArticuloVenta): ArticleSearchResult => this.mapVentaArticulo(articulo),
            );

      if (currentVersion !== this.searchVersion) {
        return;
      }

      this.results.set(results);
    } catch (error: unknown) {
      if (currentVersion !== this.searchVersion) {
        return;
      }

      this.results.set([]);
      this.error.set(getErrorMessage(error));
    } finally {
      if (currentVersion === this.searchVersion) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Adapta un artículo de Ventas a la representación
   * común utilizada por el buscador.
   */
  private mapVentaArticulo(articulo: ArticuloVenta): ArticleSearchResult {
    return {
      publicId: articulo.publicId,
      localizador: articulo.localizador,
      nombre: articulo.nombre,
      marca: articulo.marca,
      precioMicros: (articulo.pvpDescuentoCents ?? articulo.pvpCents) * 10_000,
      stock: articulo.stock,
      ventaArticulo: articulo,
      pedidoArticulo: null,
    };
  }

  /**
   * Adapta un artículo de Pedido a la representación
   * común utilizada por el buscador.
   */
  private mapPedidoArticulo(articulo: PedidoArticuloInterface): ArticleSearchResult {
    return {
      publicId: articulo.publicId,
      localizador: articulo.localizador,
      nombre: articulo.nombre,
      marca: articulo.marcaNombre,
      precioMicros: articulo.pvpMicros,
      stock: articulo.stock,
      ventaArticulo: null,
      pedidoArticulo: articulo,
    };
  }
}
