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
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'otpv-historical-sale-email-form',
  templateUrl: './historical-sale-email-form.component.html',
  styleUrl: './historical-sale-email-form.component.scss',
  imports: [MatButton, MatFormField, MatHint, MatIcon, MatInput, MatLabel],
})
export default class HistoricalSaleEmailFormComponent {
  readonly saving: InputSignal<boolean> = input<boolean>(false);

  readonly sendEvent: OutputEmitterRef<string> = output<string>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly destinatario: WritableSignal<string> = signal<string>('');

  readonly destinatarioValido: Signal<boolean> = computed((): boolean =>
    this.isValidRecipient(this.destinatario()),
  );

  /**
   * Actualiza la dirección introducida
   * sin persistirla fuera del formulario.
   */
  onDestinatarioInput(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.destinatario.set(input.value);
  }

  /**
   * Valida el formulario y solicita el envío.
   */
  submit(event: Event): void {
    event.preventDefault();

    if (this.saving() || !this.destinatarioValido()) {
      return;
    }

    this.sendEvent.emit(this.destinatario().trim());
  }

  /**
   * Cancela la introducción del destinatario.
   */
  cancel(): void {
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Realiza la validación ligera de presentación.
   *
   * El backend vuelve a validar autoritativamente.
   */
  private isValidRecipient(value: string): boolean {
    const recipient: string = value.trim();

    return recipient.length > 0 && recipient.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(recipient);
  }
}
