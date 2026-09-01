import {
  afterNextRender,
  Component,
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
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type Marca from '@model/marcas/marca.model';

type ProviderTextField = 'nombre' | 'direccion' | 'email' | 'web' | 'telefono' | 'observaciones';

/**
 * Permite crear rápidamente un proveedor desde la ficha de Artículos.
 */
@Component({
  selector: 'otpv-provider-quick-create',
  templateUrl: './provider-quick-create.component.html',
  imports: [MatButton, MatIcon],
})
export default class ProviderQuickCreateComponent {
  private readonly nameInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  readonly marcas: InputSignal<readonly Marca[]> = input.required<readonly Marca[]>();
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly error: InputSignal<string | null> = input<string | null>(null);
  readonly createEvent: OutputEmitterRef<CrearProveedorCommand> = output<CrearProveedorCommand>();
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly nombre: WritableSignal<string> = signal<string>('');
  readonly direccion: WritableSignal<string> = signal<string>('');
  readonly email: WritableSignal<string> = signal<string>('');
  readonly web: WritableSignal<string> = signal<string>('');
  readonly telefono: WritableSignal<string> = signal<string>('');
  readonly observaciones: WritableSignal<string> = signal<string>('');
  readonly selectedMarcaIds: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(
    new Set<number>(),
  );

  constructor() {
    afterNextRender((): void => {
      this.nameInput().nativeElement.focus();
    });
  }

  /**
   * Actualiza uno de los campos de texto del formulario.
   */
  updateText(event: Event, field: ProviderTextField): void {
    const inputElement: HTMLInputElement | HTMLTextAreaElement = event.target as
      HTMLInputElement | HTMLTextAreaElement;

    switch (field) {
      case 'nombre':
        this.nombre.set(inputElement.value);
        return;

      case 'direccion':
        this.direccion.set(inputElement.value);
        return;

      case 'email':
        this.email.set(inputElement.value);
        return;

      case 'web':
        this.web.set(inputElement.value);
        return;

      case 'telefono':
        this.telefono.set(inputElement.value);
        return;

      case 'observaciones':
        this.observaciones.set(inputElement.value);
        return;
    }
  }

  /**
   * Añade o elimina una marca de la selección.
   */
  toggleMarca(event: Event, idMarca: number): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const selectedMarcaIds: Set<number> = new Set<number>(this.selectedMarcaIds());

    if (inputElement.checked) {
      selectedMarcaIds.add(idMarca);
    } else {
      selectedMarcaIds.delete(idMarca);
    }

    this.selectedMarcaIds.set(selectedMarcaIds);
  }

  /**
   * Indica si una marca está seleccionada.
   */
  isMarcaSelected(idMarca: number): boolean {
    return this.selectedMarcaIds().has(idMarca);
  }

  /**
   * Solicita la creación del proveedor.
   */
  submit(event: Event): void {
    event.preventDefault();

    if (this.saving() || this.nombre().trim() === '') {
      return;
    }

    this.createEvent.emit({
      nombre: this.nombre().trim(),
      direccion: this.normalizeOptional(this.direccion()),
      email: this.normalizeOptional(this.email()),
      web: this.normalizeOptional(this.web()),
      telefono: this.normalizeOptional(this.telefono()),
      observaciones: this.normalizeOptional(this.observaciones()),
      idsMarcas: [...this.selectedMarcaIds()],
    });
  }

  /**
   * Cierra el modal cuando no existe una creación en curso.
   */
  close(): void {
    if (!this.saving()) {
      this.closeEvent.emit();
    }
  }

  /**
   * Normaliza un campo opcional antes de enviarlo.
   */
  private normalizeOptional(value: string): string | null {
    const normalizedValue: string = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }
}
