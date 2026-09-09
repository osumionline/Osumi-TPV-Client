import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type OnDestroy,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import AlmacenService from '@services/almacen.service';
import { getErrorMessage } from '@utils/error.utils';
import { formatEuros } from '@utils/format.utils';
import SEARCH_DELAY_MS from './caducidad-create.component.private';

/**
 * Permite seleccionar un artículo y registrar
 * las unidades retiradas por caducidad.
 */
@Component({
  selector: 'otpv-caducidad-create',
  templateUrl: './caducidad-create.component.html',
  styleUrl: './caducidad-create.component.scss',
  imports: [MatButton, MatFormField, MatIcon, MatIconButton, MatInput, MatLabel],
})
export default class CaducidadCreateComponent implements AfterViewInit, OnDestroy {
  readonly almacenService: AlmacenService = inject(AlmacenService);

  readonly saving = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly createEvent = output<CaducidadCreateCommand>();
  readonly closeEvent = output<void>();

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  readonly query: WritableSignal<string> = signal<string>('');
  readonly results: WritableSignal<readonly CaducidadArticuloSearchInterface[]> = signal<
    readonly CaducidadArticuloSearchInterface[]
  >([]);
  readonly selectedArticle: WritableSignal<CaducidadArticuloSearchInterface | null> =
    signal<CaducidadArticuloSearchInterface | null>(null);
  readonly unidades: WritableSignal<string> = signal<string>('1');
  readonly searchLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchError: WritableSignal<string | null> = signal<string | null>(null);

  readonly canSubmit: Signal<boolean> = computed(
    (): boolean => !this.saving() && this.selectedArticle() !== null && this.parseUnits() !== null,
  );
  readonly unitsExceedStock: Signal<boolean> = computed((): boolean => {
    const article: CaducidadArticuloSearchInterface | null = this.selectedArticle();

    if (article === null) {
      return false;
    }

    const value: string = this.unidades().trim();

    if (!/^\d+$/.test(value)) {
      return false;
    }

    const unidades: number = Number(value);

    return Number.isSafeInteger(unidades) && unidades > article.stock;
  });

  private searchTimeoutId: number | null = null;
  private searchSequence: number = 0;
  private destroyed: boolean = false;

  /**
   * Sitúa el foco en el buscador cuando el modal
   * termina de renderizarse.
   */
  ngAfterViewInit(): void {
    window.requestAnimationFrame((): void => {
      if (this.destroyed) {
        return;
      }

      const inputElement: HTMLInputElement = this.searchInput().nativeElement;

      inputElement.focus();
      inputElement.select();
    });
  }

  /**
   * Cancela búsquedas pendientes al cerrar el modal.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.searchSequence++;
    this.clearSearchTimeout();
  }

  /**
   * Programa la búsqueda remota del artículo.
   */
  onSearchInput(event: Event): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.query.set(inputElement.value);
    this.selectedArticle.set(null);
    this.unidades.set('1');
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
   * Selecciona uno de los artículos encontrados.
   */
  selectArticle(article: CaducidadArticuloSearchInterface): void {
    if (this.saving()) {
      return;
    }

    this.selectedArticle.set(article);
    this.unidades.set('1');
  }

  /**
   * Conserva el valor escrito en el campo unidades.
   */
  onUnitsInput(event: Event): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.unidades.set(inputElement.value);
  }

  /**
   * Emite el alta cuando artículo y unidades son válidos.
   */
  submit(): void {
    if (this.saving()) {
      return;
    }

    const article: CaducidadArticuloSearchInterface | null = this.selectedArticle();
    const unidades: number | null = this.parseUnits();

    if (article === null || unidades === null) {
      return;
    }

    this.createEvent.emit({
      idArticulo: article.id,
      unidades,
    });
  }

  /**
   * Solicita cerrar el modal si no hay una operación activa.
   */
  close(): void {
    if (this.saving()) {
      return;
    }

    this.closeEvent.emit();
  }

  /**
   * Formatea microeuros para presentación.
   */
  formatMicros(value: number): string {
    return formatEuros(value / 1_000_000);
  }

  /**
   * Formatea céntimos para presentación.
   */
  formatCents(value: number): string {
    return formatEuros(value / 100);
  }

  /**
   * Ejecuta una búsqueda y descarta respuestas obsoletas.
   */
  private async search(texto: string): Promise<void> {
    const requestId: number = ++this.searchSequence;

    this.searchLoading.set(true);
    this.searchError.set(null);

    try {
      const results: readonly CaducidadArticuloSearchInterface[] =
        await this.almacenService.searchCaducidadArticulos(texto);

      if (this.destroyed || requestId !== this.searchSequence) {
        return;
      }

      this.results.set(results);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.searchSequence) {
        return;
      }

      this.results.set([]);
      this.searchError.set(getErrorMessage(error, 'No se han podido buscar artículos.'));
    } finally {
      if (!this.destroyed && requestId === this.searchSequence) {
        this.searchLoading.set(false);
      }
    }
  }

  /**
   * Convierte las unidades en un entero positivo que no
   * supere el stock actualmente mostrado del artículo.
   */
  private parseUnits(): number | null {
    const article: CaducidadArticuloSearchInterface | null = this.selectedArticle();
    const value: string = this.unidades().trim();

    if (article === null || !/^\d+$/.test(value)) {
      return null;
    }

    const unidades: number = Number(value);

    return Number.isSafeInteger(unidades) && unidades > 0 && unidades <= article.stock
      ? unidades
      : null;
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
