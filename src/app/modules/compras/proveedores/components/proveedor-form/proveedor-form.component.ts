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
import createProveedorFormInitialValue from '@model/proveedores/proveedor-form.initial-value';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import proveedorFormSchema from '@model/proveedores/proveedor-form.schema';
import {
  areProveedorFormModelsEqual,
  cloneProveedorFormModel,
} from '@model/proveedores/proveedor-form.utils';

/**
 * Edita los datos generales de un Proveedor.
 */
@Component({
  selector: 'otpv-proveedor-form',
  templateUrl: './proveedor-form.component.html',
  styleUrl: './proveedor-form.component.scss',
  imports: [FormField, MatButton, MatFormFieldModule, MatInput],
})
export default class ProveedorFormComponent {
  readonly initialValue: InputSignal<ProveedorFormModel> = input<ProveedorFormModel>(
    createProveedorFormInitialValue(),
  );

  readonly dirty: InputSignal<boolean> = input<boolean>(false);

  readonly saving: InputSignal<boolean> = input<boolean>(false);

  readonly processing: InputSignal<boolean> = input<boolean>(false);

  readonly saveSuccessful: InputSignal<boolean> = input<boolean>(false);

  readonly focusNameRequest: InputSignal<number> = input<number>(0);

  readonly canDelete: InputSignal<boolean> = input<boolean>(false);

  readonly deactivating: InputSignal<boolean> = input<boolean>(false);

  readonly modelChangeEvent: OutputEmitterRef<ProveedorFormModel> = output<ProveedorFormModel>();

  readonly saveEvent: OutputEmitterRef<ProveedorFormModel> = output<ProveedorFormModel>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly logoSelectedEvent: OutputEmitterRef<File> = output<File>();

  readonly logoRemoveEvent: OutputEmitterRef<void> = output<void>();

  readonly deleteEvent: OutputEmitterRef<void> = output<void>();

  readonly proveedorModel: WritableSignal<ProveedorFormModel> = signal<ProveedorFormModel>(
    createProveedorFormInitialValue(),
  );

  readonly proveedorForm: FieldTree<ProveedorFormModel> = form(
    this.proveedorModel,
    proveedorFormSchema,
  );

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  private readonly logoInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('logoInput');

  constructor() {
    effect((): void => {
      const initialValue: ProveedorFormModel = this.initialValue();

      const currentValue: ProveedorFormModel = untracked(this.proveedorModel);

      if (areProveedorFormModelsEqual(initialValue, currentValue)) {
        return;
      }

      this.proveedorModel.set(cloneProveedorFormModel(initialValue));
    });

    effect((): void => {
      this.focusNameRequest();

      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Comunica al workspace cualquier
   * modificación del formulario.
   */
  modelChanged(): void {
    if (this.saving() || this.processing()) {
      return;
    }

    this.modelChangeEvent.emit(cloneProveedorFormModel(this.proveedorModel()));
  }

  /**
   * Marca el formulario como tocado y
   * comprueba si sus datos son válidos.
   */
  validate(): boolean {
    this.proveedorForm().markAsTouched();

    if (!this.proveedorForm().invalid()) {
      return true;
    }

    if (this.proveedorForm.nombre().invalid()) {
      this.nameInput()?.nativeElement.focus();
    }

    return false;
  }

  /**
   * Valida el formulario y solicita
   * persistir el modelo actual.
   */
  save(event: Event): void {
    event.preventDefault();

    if (this.saving() || this.processing() || !this.dirty()) {
      return;
    }

    if (!this.validate()) {
      return;
    }

    this.saveEvent.emit(cloneProveedorFormModel(this.proveedorModel()));
  }

  /**
   * Solicita restaurar la instantánea base.
   */
  cancel(): void {
    if (this.saving() || this.processing() || !this.dirty()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Abre el selector nativo para
   * elegir el logo del Proveedor.
   */
  selectLogo(): void {
    if (this.saving() || this.processing()) {
      return;
    }

    this.logoInput()?.nativeElement.click();
  }

  /**
   * Comunica el archivo seleccionado y
   * reinicia el input de archivo.
   */
  onLogoSelected(event: Event): void {
    if (this.saving() || this.processing()) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const file: File | null = inputElement.files?.item(0) ?? null;

    inputElement.value = '';

    if (file === null) {
      return;
    }

    this.logoSelectedEvent.emit(file);
  }

  /**
   * Solicita quitar el logo visible.
   */
  removeLogo(): void {
    if (this.saving() || this.processing() || this.proveedorModel().foto === null) {
      return;
    }

    this.logoRemoveEvent.emit();
  }

  /**
   * Solicita la baja del Proveedor
   * persistido actualmente abierto.
   */
  deleteProveedor(): void {
    if (!this.canDelete() || this.processing()) {
      return;
    }

    this.deleteEvent.emit();
  }
}
