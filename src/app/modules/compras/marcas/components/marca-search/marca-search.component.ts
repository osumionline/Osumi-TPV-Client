import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type Marca from '@model/marcas/marca.model';
import { filterMarcas } from '@modules/compras/marcas/components/marca-search/marca-search.component.private';

/**
 * Muestra el selector de Marcas cargadas en memoria.
 */
@Component({
  selector: 'otpv-marca-search',
  templateUrl: './marca-search.component.html',
  styleUrl: './marca-search.component.scss',
  imports: [MatIcon, MatIconButton],
})
export default class MarcaSearchComponent {
  readonly marcas: InputSignal<readonly Marca[]> = input.required<readonly Marca[]>();

  readonly selectedPublicId: InputSignal<string | null> = input<string | null>(null);

  readonly selectEvent: OutputEmitterRef<Marca> = output<Marca>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');

  readonly filteredMarcas: Signal<readonly Marca[]> = computed((): readonly Marca[] =>
    filterMarcas(this.marcas(), this.query()),
  );

  private readonly searchInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly focusSearchRef = afterRenderEffect({
    write: (): void => {
      this.searchInput()?.nativeElement.focus();
    },
  });

  /**
   * Actualiza el texto utilizado para filtrar Marcas.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);
  }

  /**
   * Selecciona la Marca indicada.
   */
  select(marca: Marca): void {
    this.selectEvent.emit(marca);
  }

  /**
   * Cierra el buscador sin cambiar la ficha activa.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }
}
