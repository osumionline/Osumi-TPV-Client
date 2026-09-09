import { Component, inject, signal, type OnDestroy, type WritableSignal } from '@angular/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type { ImprentaArticuloSearchInterface } from '@desktop-contracts/almacen/imprenta-articulo.interface';
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
  imports: [MatFormField, MatInput, MatLabel],
})
export default class ImprentaComponent implements OnDestroy {
  readonly almacenService: AlmacenService = inject(AlmacenService);
  readonly query: WritableSignal<string> = signal<string>('');
  readonly results: WritableSignal<readonly ImprentaArticuloSearchInterface[]> = signal<
    readonly ImprentaArticuloSearchInterface[]
  >([]);
  readonly searchLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchError: WritableSignal<string | null> = signal<string | null>(null);

  private searchTimeoutId: number | null = null;
  private searchSequence: number = 0;
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
          idsArticulosExcluidos: [],
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
