import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
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
import {
  areClienteFormModelsEqual,
  cloneClienteFormModel,
} from '@model/clientes/cliente-form.utils';
import ProvinciasService from '@services/provincias.service';

type ClientFormSection = 'all' | 'data' | 'billing';
type ClientFormInvalidSection = 'data' | 'billing';

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
  readonly initialValue: InputSignal<ClienteFormModel> = input<ClienteFormModel>(
    createClienteFormInitialValue(),
  );
  readonly section: InputSignal<ClientFormSection> = input<ClientFormSection>('all');
  readonly showActions: InputSignal<boolean> = input<boolean>(true);

  readonly saveEvent: OutputEmitterRef<ClienteFormModel> = output<ClienteFormModel>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();
  readonly modelChangeEvent: OutputEmitterRef<ClienteFormModel> = output<ClienteFormModel>();

  readonly clienteModel: WritableSignal<ClienteFormModel> = signal<ClienteFormModel>(
    createClienteFormInitialValue(),
  );

  readonly clienteForm: FieldTree<ClienteFormModel> = form(this.clienteModel, clienteFormSchema);

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect((): void => {
      const initialValue: ClienteFormModel = this.initialValue();
      const currentValue: ClienteFormModel = untracked(this.clienteModel);

      if (areClienteFormModelsEqual(initialValue, currentValue)) {
        return;
      }

      this.clienteModel.set(cloneClienteFormModel(initialValue));
    });

    afterNextRender((): void => {
      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Comunica una modificación realizada por el usuario.
   */
  modelChanged(): void {
    if (this.saving()) {
      return;
    }

    this.modelChangeEvent.emit(cloneClienteFormModel(this.clienteModel()));
  }

  /**
   * Marca la ficha completa como tocada y devuelve la sección
   * que contiene el primer bloque de errores.
   */
  validate(): ClientFormInvalidSection | null {
    this.clienteForm().markAsTouched();

    if (!this.clienteForm().invalid()) {
      return null;
    }

    if (this.hasDataErrors()) {
      if (this.section() !== 'billing' && this.clienteForm.nombreApellidos().invalid()) {
        this.nameInput()?.nativeElement.focus();
      }

      return 'data';
    }

    return 'billing';
  }

  /**
   * Valida el formulario y solicita el guardado de sus datos.
   */
  save(event: Event): void {
    event.preventDefault();

    if (this.saving() || !this.showActions()) {
      return;
    }

    if (this.validate() !== null) {
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
    if (this.saving() || !this.showActions()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Indica si alguno de los campos de Datos contiene errores.
   */
  private hasDataErrors(): boolean {
    return (
      this.clienteForm.nombreApellidos().invalid() ||
      this.clienteForm.dniCif().invalid() ||
      this.clienteForm.telefono().invalid() ||
      this.clienteForm.email().invalid() ||
      this.clienteForm.direccion().invalid() ||
      this.clienteForm.codigoPostal().invalid() ||
      this.clienteForm.poblacion().invalid() ||
      this.clienteForm.provincia().invalid() ||
      this.clienteForm.descuento().invalid() ||
      this.clienteForm.observaciones().invalid()
    );
  }
}
