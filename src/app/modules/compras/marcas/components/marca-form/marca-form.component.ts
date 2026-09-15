import {
  Component,
  effect,
  ElementRef,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import createMarcaFormInitialValue from '@model/marcas/marca-form.initial-value';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import marcaFormSchema from '@model/marcas/marca-form.schema';
import { areMarcaFormModelsEqual, cloneMarcaFormModel } from '@model/marcas/marca-form.utils';

/**
 * Edita los datos generales de una Marca.
 */
@Component({
  selector: 'otpv-marca-form',
  templateUrl: './marca-form.component.html',
  styleUrl: './marca-form.component.scss',
  imports: [FormField, MatButton, MatFormFieldModule, MatInput],
})
export default class MarcaFormComponent {
  readonly initialValue: InputSignal<MarcaFormModel> = input<MarcaFormModel>(
    createMarcaFormInitialValue(),
  );
  readonly dirty: InputSignal<boolean> = input<boolean>(false);
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly saveSuccessful: InputSignal<boolean> = input<boolean>(false);
  readonly focusNameRequest: InputSignal<number> = input<number>(0);

  readonly modelChangeEvent: OutputEmitterRef<MarcaFormModel> = output<MarcaFormModel>();
  readonly saveEvent: OutputEmitterRef<MarcaFormModel> = output<MarcaFormModel>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly marcaModel: WritableSignal<MarcaFormModel> = signal<MarcaFormModel>(
    createMarcaFormInitialValue(),
  );

  readonly marcaForm: FieldTree<MarcaFormModel> = form(this.marcaModel, marcaFormSchema);

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect((): void => {
      const initialValue: MarcaFormModel = this.initialValue();

      const currentValue: MarcaFormModel = untracked(this.marcaModel);

      if (areMarcaFormModelsEqual(initialValue, currentValue)) {
        return;
      }

      this.marcaModel.set(cloneMarcaFormModel(initialValue));
    });
    effect((): void => {
      this.focusNameRequest();
      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Comunica al workspace cualquier modificación
   * realizada por el usuario.
   */
  modelChanged(): void {
    if (this.saving()) {
      return;
    }

    this.modelChangeEvent.emit(cloneMarcaFormModel(this.marcaModel()));
  }

  /**
   * Marca el formulario como tocado y devuelve
   * si todos sus datos son válidos.
   */
  validate(): boolean {
    this.marcaForm().markAsTouched();

    if (!this.marcaForm().invalid()) {
      return true;
    }

    if (this.marcaForm.nombre().invalid()) {
      this.nameInput()?.nativeElement.focus();
    }

    return false;
  }

  /**
   * Valida el formulario y solicita persistir
   * el modelo editable actual.
   */
  save(event: Event): void {
    event.preventDefault();

    if (this.saving() || !this.dirty()) {
      return;
    }

    if (!this.validate()) {
      return;
    }

    this.saveEvent.emit(cloneMarcaFormModel(this.marcaModel()));
  }

  /**
   * Solicita restaurar la instantánea base
   * cuando existen cambios pendientes.
   */
  cancel(): void {
    if (this.saving() || !this.dirty()) {
      return;
    }

    this.cancelEvent.emit();
  }
}
