import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ComprasService from '@services/compras.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra las líneas que forman parte de un Pedido.
 */
@Component({
  selector: 'otpv-purchase-order-lines',
  templateUrl: './purchase-order-lines.component.html',
  styleUrl: './purchase-order-lines.component.scss',
  imports: [BpsToPercentPipe, DecimalPipe, MatIcon, MatIconButton, MatTooltip, MicrosToEurosPipe],
})
export default class PurchaseOrderLinesComponent {
  private readonly comprasService: ComprasService = inject(ComprasService);

  readonly lines: InputSignal<readonly PurchaseOrderLineState[]> =
    input.required<readonly PurchaseOrderLineState[]>();
  readonly visibleColumns: InputSignal<readonly number[]> = input.required<readonly number[]>();
  readonly recargoEquivalencia: InputSignal<boolean> = input.required<boolean>();
  readonly disabled: InputSignal<boolean> = input.required<boolean>();

  readonly articleSelected: OutputEmitterRef<PedidoArticuloInterface> =
    output<PedidoArticuloInterface>();

  readonly searchText: WritableSignal<string> = signal<string>('');
  readonly searching: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchResults: WritableSignal<readonly PedidoArticuloInterface[]> = signal<
    readonly PedidoArticuloInterface[]
  >([]);
  readonly searchMessage: WritableSignal<string | null> = signal<string | null>(null);

  readonly visibleColumnIds: Signal<ReadonlySet<number>> = computed(
    (): ReadonlySet<number> => new Set<number>(this.visibleColumns()),
  );

  /**
   * Actualiza el texto del buscador y elimina
   * resultados pertenecientes a una consulta anterior.
   */
  onSearchInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.searchText.set(inputElement.value);
    this.searchResults.set([]);
    this.searchMessage.set(null);
  }

  /**
   * Ejecuta la búsqueda cuando se pulsa Enter.
   */
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    void this.searchArticle();
  }

  /**
   * Ejecuta manualmente la búsqueda actual.
   */
  onSearchClick(): void {
    void this.searchArticle();
  }

  /**
   * Selecciona uno de los resultados de búsqueda
   * y limpia el buscador.
   */
  selectArticle(articulo: PedidoArticuloInterface): void {
    if (this.disabled()) {
      return;
    }

    this.articleSelected.emit(articulo);
    this.clearSearch();
  }

  /**
   * Resuelve primero códigos exactos y, cuando no existe
   * coincidencia, realiza una búsqueda libre por artículo.
   */
  private async searchArticle(): Promise<void> {
    if (this.disabled() || this.searching()) {
      return;
    }

    const searchText: string = this.searchText().trim();

    if (searchText.length === 0) {
      this.searchResults.set([]);
      this.searchMessage.set(null);

      return;
    }

    this.searching.set(true);
    this.searchResults.set([]);
    this.searchMessage.set(null);

    try {
      const exactArticle: PedidoArticuloInterface | null =
        searchText.length <= 100
          ? await this.comprasService.resolvePedidoArticulo(searchText)
          : null;

      if (exactArticle !== null) {
        this.selectArticle(exactArticle);

        return;
      }

      const results: readonly PedidoArticuloInterface[] =
        await this.comprasService.searchPedidoArticulos(searchText);

      this.searchResults.set(results);

      if (results.length === 0) {
        this.searchMessage.set('No se han encontrado artículos.');
      }
    } catch (error: unknown) {
      this.searchMessage.set(getErrorMessage(error, 'No se ha podido buscar el artículo.'));
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Vacía el texto, los resultados y cualquier
   * mensaje asociado a la búsqueda anterior.
   */
  private clearSearch(): void {
    this.searchText.set('');
    this.searchResults.set([]);
    this.searchMessage.set(null);
  }
}
