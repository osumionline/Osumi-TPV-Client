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
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';

type BrandTextField = 'nombre' | 'telefono' | 'email' | 'direccion' | 'web' | 'observaciones';

/**
 * Permite crear rápidamente una marca desde la ficha de Artículos.
 */
@Component({
  selector: 'otpv-brand-quick-create',
  templateUrl: './brand-quick-create.component.html',
  imports: [MatButton, MatIcon],
})
export default class BrandQuickCreateComponent {
  private readonly nameInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly error: InputSignal<string | null> = input<string | null>(null);
  readonly createEvent: OutputEmitterRef<CrearMarcaCommand> = output<CrearMarcaCommand>();
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly nombre: WritableSignal<string> = signal<string>('');
  readonly telefono: WritableSignal<string> = signal<string>('');
  readonly email: WritableSignal<string> = signal<string>('');
  readonly direccion: WritableSignal<string> = signal<string>('');
  readonly web: WritableSignal<string> = signal<string>('');
  readonly observaciones: WritableSignal<string> = signal<string>('');
  readonly crearProveedor: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    afterNextRender((): void => {
      this.nameInput().nativeElement.focus();
    });
  }

  /**
   * Actualiza uno de los campos de texto del formulario.
   */
  updateText(event: Event, field: BrandTextField): void {
    const inputElement: HTMLInputElement | HTMLTextAreaElement = event.target as
      HTMLInputElement | HTMLTextAreaElement;

    switch (field) {
      case 'nombre':
        this.nombre.set(inputElement.value);
        return;

      case 'telefono':
        this.telefono.set(inputElement.value);
        return;

      case 'email':
        this.email.set(inputElement.value);
        return;

      case 'direccion':
        this.direccion.set(inputElement.value);
        return;

      case 'web':
        this.web.set(inputElement.value);
        return;

      case 'observaciones':
        this.observaciones.set(inputElement.value);
        return;
    }
  }

  /**
   * Actualiza la opción de creación automática de proveedor.
   */
  updateCrearProveedor(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.crearProveedor.set(inputElement.checked);
  }

  /**
   * Solicita la creación de la marca.
   */
  submit(event: Event): void {
    event.preventDefault();

    if (this.saving() || this.nombre().trim() === '') {
      return;
    }

    this.createEvent.emit({
      nombre: this.nombre().trim(),
      telefono: this.normalizeOptional(this.telefono()),
      email: this.normalizeOptional(this.email()),
      direccion: this.normalizeOptional(this.direccion()),
      web: this.normalizeOptional(this.web()),
      observaciones: this.normalizeOptional(this.observaciones()),
      crearProveedor: this.crearProveedor(),
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
