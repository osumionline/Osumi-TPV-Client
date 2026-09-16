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
import type Proveedor from '@model/proveedores/proveedor.model';
import { filterProveedores } from '@modules/compras/proveedores/components/proveedor-search/proveedor-search.component.private';

/**
 * Muestra el selector de Proveedores
 * ya cargados en memoria.
 */
@Component({
  selector: 'otpv-proveedor-search',
  templateUrl: './proveedor-search.component.html',
  styleUrl: './proveedor-search.component.scss',
  imports: [MatIcon, MatIconButton],
})
export default class ProveedorSearchComponent {
  readonly proveedores: InputSignal<readonly Proveedor[]> = input.required<readonly Proveedor[]>();

  readonly selectedPublicId: InputSignal<string | null> = input<string | null>(null);

  readonly selectEvent: OutputEmitterRef<Proveedor> = output<Proveedor>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');

  readonly filteredProveedores: Signal<readonly Proveedor[]> = computed((): readonly Proveedor[] =>
    filterProveedores(this.proveedores(), this.query()),
  );

  private readonly searchInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly focusSearchRef = afterRenderEffect({
    write: (): void => {
      this.searchInput()?.nativeElement.focus();
    },
  });

  /**
   * Actualiza el texto utilizado para
   * filtrar Proveedores.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);
  }

  /**
   * Selecciona el Proveedor indicado.
   */
  select(proveedor: Proveedor): void {
    this.selectEvent.emit(proveedor);
  }

  /**
   * Cierra el buscador sin modificar
   * la ficha actualmente abierta.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }
}
