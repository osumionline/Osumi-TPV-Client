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
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import VentasArticulosService from '@services/ventas-articulos.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Busca artículos para añadir uno o varios a una venta.
 */
@Component({
  selector: 'otpv-article-search',
  templateUrl: './article-search.component.html',
  styleUrl: './article-search.component.scss',
  imports: [CurrencyPipe, CentsToEurosPipe, MatButton, MatIcon],
})
export default class ArticleSearchComponent implements OnInit, OnDestroy {
  private readonly ventasArticulosService: VentasArticulosService = inject(VentasArticulosService);

  private searchTimeoutId: number | null = null;
  private searchVersion: number = 0;

  private readonly searchInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly initialQuery: InputSignal<string> = input<string>('');

  readonly selectEvent: OutputEmitterRef<readonly ArticuloVenta[]> =
    output<readonly ArticuloVenta[]>();

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');

  readonly results: WritableSignal<readonly ArticuloVenta[]> = signal<readonly ArticuloVenta[]>([]);

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
  toggleArticulo(articulo: ArticuloVenta): void {
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
  selectArticulo(articulo: ArticuloVenta): void {
    this.selectEvent.emit([articulo]);
  }

  /**
   * Devuelve al módulo de ventas los artículos seleccionados.
   */
  confirm(): void {
    const selectedPublicIds: ReadonlySet<string> = this.selectedPublicIds();

    const selected: readonly ArticuloVenta[] = this.results().filter(
      (articulo: ArticuloVenta): boolean => selectedPublicIds.has(articulo.publicId),
    );

    if (selected.length === 0) {
      return;
    }

    this.selectEvent.emit(selected);
  }

  /**
   * Cierra el buscador sin seleccionar artículos.
   */
  close(): void {
    this.closeEvent.emit();
  }

  /**
   * Consulta los artículos que coinciden con el texto actual.
   */
  private async search(): Promise<void> {
    const currentVersion: number = ++this.searchVersion;

    this.loading.set(true);
    this.error.set(null);

    try {
      const results: readonly ArticuloVenta[] = await this.ventasArticulosService.search(
        this.query(),
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
}
