import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import clienteFormSchema from '@model/clientes/cliente-form.schema';
import ProvinciasService from '@services/provincias.service';

@Component({
  selector: 'otpv-client-form',
  templateUrl: './client-form.component.html',
  styleUrl: './client-form.component.scss',
  imports: [FormField, MatButton, MatCheckbox, MatFormFieldModule, MatInput],
})
export default class ClientFormComponent {
  readonly provinciasService: ProvinciasService = inject(ProvinciasService);

  readonly saving: InputSignal<boolean> = input<boolean>(false);

  readonly submitLabel: InputSignal<string> = input<string>('Guardar');

  readonly saveEvent: OutputEmitterRef<ClienteFormModel> = output<ClienteFormModel>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly clienteModel: WritableSignal<ClienteFormModel> = signal<ClienteFormModel>(
    createClienteFormInitialValue(),
  );

  readonly clienteForm: FieldTree<ClienteFormModel> = form(this.clienteModel, clienteFormSchema);

  private readonly nameInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender((): void => {
      this.nameInput().nativeElement.focus();
    });
  }

  /**
   * Valida el formulario y solicita el guardado de sus datos.
   */
  save(event: Event): void {
    event.preventDefault();

    if (this.saving()) {
      return;
    }

    this.clienteForm().markAsTouched();

    if (this.clienteForm().invalid()) {
      if (this.clienteForm.nombreApellidos().invalid()) {
        this.nameInput().nativeElement.focus();
      }

      return;
    }

    this.saveEvent.emit({
      ...this.clienteModel(),
    });
  }

  /**
   * Cancela la edición sin guardar.
   */
  cancel(): void {
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }
}
