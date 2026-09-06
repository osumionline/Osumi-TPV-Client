import {
  Component,
  computed,
  input,
  linkedSignal,
  output,
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
  selector: 'otpv-client-invoice-email-form',
  templateUrl: './client-invoice-email-form.component.html',
  styleUrl: './client-invoice-email-form.component.scss',
  imports: [MatButton, MatFormField, MatHint, MatIcon, MatInput, MatLabel],
})
export default class ClientInvoiceEmailFormComponent {
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly destinatarioInicial: InputSignal<string> = input<string>('');
  readonly sendEvent: OutputEmitterRef<string> = output<string>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();
  readonly destinatario: WritableSignal<string> = linkedSignal((): string =>
    this.destinatarioInicial(),
  );
  readonly destinatarioValido: Signal<boolean> = computed((): boolean =>
    this.isValidRecipient(this.destinatario()),
  );

  /**
   * Actualiza el destinatario sin modificar nunca
   * la ficha persistida del cliente.
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
   * Cierra el formulario sin realizar el envío.
   */
  cancel(): void {
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Realiza una validación ligera de presentación.
   *
   * Backend vuelve a validar autoritativamente.
   */
  private isValidRecipient(value: string): boolean {
    const recipient: string = value.trim();

    return recipient.length > 0 && recipient.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(recipient);
  }
}
