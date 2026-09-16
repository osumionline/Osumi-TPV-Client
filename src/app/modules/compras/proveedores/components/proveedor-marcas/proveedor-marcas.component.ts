import {
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import type Marca from '@model/marcas/marca.model';
import filterProveedorMarcas from '@modules/compras/proveedores/components/proveedor-marcas/proveedor-marcas.filter';

/**
 * Gestiona las Marcas activas asociadas
 * al Proveedor actualmente abierto.
 */
@Component({
  selector: 'otpv-proveedor-marcas',
  templateUrl: './proveedor-marcas.component.html',
  styleUrl: './proveedor-marcas.component.scss',
  imports: [MatButton, MatCheckbox],
})
export default class ProveedorMarcasComponent {
  readonly marcas: InputSignal<readonly Marca[]> = input.required<readonly Marca[]>();
  readonly selectedIds: InputSignal<readonly number[]> = input.required<readonly number[]>();
  readonly dirty: InputSignal<boolean> = input<boolean>(false);
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly processing: InputSignal<boolean> = input<boolean>(false);
  readonly saveSuccessful: InputSignal<boolean> = input<boolean>(false);

  readonly selectionChangeEvent: OutputEmitterRef<readonly number[]> = output<readonly number[]>();
  readonly saveEvent: OutputEmitterRef<void> = output<void>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');

  readonly filteredMarcas: Signal<readonly Marca[]> = computed((): readonly Marca[] =>
    filterProveedorMarcas(this.marcas(), this.selectedIds(), this.query()),
  );

  /**
   * Actualiza la búsqueda local.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);
  }

  /**
   * Indica si una Marca forma parte
   * del draft actual del Proveedor.
   */
  isSelected(marca: Marca): boolean {
    return marca.id !== null && this.selectedIds().includes(marca.id);
  }

  /**
   * Añade o elimina una Marca de la
   * selección editable actual.
   */
  toggleMarca(marca: Marca, checked: boolean): void {
    if (this.processing() || marca.id === null) {
      return;
    }

    const selectedIds: Set<number> = new Set<number>(this.selectedIds());

    if (checked) {
      selectedIds.add(marca.id);
    } else {
      selectedIds.delete(marca.id);
    }

    this.selectionChangeEvent.emit([...selectedIds]);
  }

  /**
   * Solicita guardar el draft compartido.
   */
  save(): void {
    if (!this.dirty() || this.processing()) {
      return;
    }

    this.saveEvent.emit();
  }

  /**
   * Solicita restaurar la instantánea
   * principal del Proveedor.
   */
  cancel(): void {
    if (!this.dirty() || this.processing()) {
      return;
    }

    this.cancelEvent.emit();
  }
}
