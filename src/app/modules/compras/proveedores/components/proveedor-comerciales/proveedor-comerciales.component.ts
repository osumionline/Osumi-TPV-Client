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
import { MatOption, MatSelect } from '@angular/material/select';
import createComercialFormInitialValue from '@model/proveedores/comercial-form.initial-value';
import type ComercialFormModel from '@model/proveedores/comercial-form.model';
import comercialFormSchema from '@model/proveedores/comercial-form.schema';
import {
  areComercialFormModelsEqual,
  cloneComercialFormModel,
} from '@model/proveedores/comercial-form.utils';
import type Comercial from '@model/proveedores/comercial.model';
import type ProveedorComercialWorkspace from '@model/proveedores/proveedor-comercial-workspace.interface';

/**
 * Gestiona la selección y edición independiente
 * de Comerciales de un Proveedor persistido.
 */
@Component({
  selector: 'otpv-proveedor-comerciales',
  templateUrl: './proveedor-comerciales.component.html',
  styleUrl: './proveedor-comerciales.component.scss',
  imports: [FormField, MatButton, MatFormFieldModule, MatInput, MatOption, MatSelect],
})
export default class ProveedorComercialesComponent {
  readonly comerciales: InputSignal<readonly Comercial[]> = input.required<readonly Comercial[]>();
  readonly workspace: InputSignal<ProveedorComercialWorkspace | null> =
    input<ProveedorComercialWorkspace | null>(null);
  readonly dirty: InputSignal<boolean> = input<boolean>(false);
  readonly saving: InputSignal<boolean> = input<boolean>(false);
  readonly processing: InputSignal<boolean> = input<boolean>(false);
  readonly deactivating: InputSignal<boolean> = input<boolean>(false);
  readonly saveSuccessful: InputSignal<boolean> = input<boolean>(false);

  readonly newEvent: OutputEmitterRef<void> = output<void>();
  readonly selectEvent: OutputEmitterRef<Comercial> = output<Comercial>();
  readonly modelChangeEvent: OutputEmitterRef<ComercialFormModel> = output<ComercialFormModel>();
  readonly saveEvent: OutputEmitterRef<ComercialFormModel> = output<ComercialFormModel>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();
  readonly deleteEvent: OutputEmitterRef<void> = output<void>();

  readonly comercialModel: WritableSignal<ComercialFormModel> = signal<ComercialFormModel>(
    createComercialFormInitialValue(),
  );

  readonly comercialForm: FieldTree<ComercialFormModel> = form(
    this.comercialModel,
    comercialFormSchema,
  );

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    effect((): void => {
      const workspace: ProveedorComercialWorkspace | null = this.workspace();
      const nextValue: ComercialFormModel = workspace?.draft ?? createComercialFormInitialValue();
      const currentValue: ComercialFormModel = untracked(this.comercialModel);

      if (areComercialFormModelsEqual(nextValue, currentValue)) {
        return;
      }

      this.comercialModel.set(cloneComercialFormModel(nextValue));
    });
  }

  /**
   * Solicita abrir el Comercial
   * seleccionado en el desplegable.
   */
  selectComercial(idComercial: number): void {
    if (this.processing()) {
      return;
    }

    const comercial: Comercial | undefined = this.comerciales().find(
      (item: Comercial): boolean => item.id === idComercial,
    );

    if (comercial === undefined) {
      return;
    }

    this.selectEvent.emit(comercial);
  }

  /**
   * Solicita comenzar un Comercial nuevo.
   */
  newComercial(): void {
    if (this.processing()) {
      return;
    }

    this.newEvent.emit();
  }

  /**
   * Comunica cualquier modificación del
   * formulario al workspace persistente.
   */
  modelChanged(): void {
    if (this.processing()) {
      return;
    }

    this.modelChangeEvent.emit(cloneComercialFormModel(this.comercialModel()));
  }

  /**
   * Marca el formulario como tocado
   * y comprueba su validez.
   */
  validate(): boolean {
    this.comercialForm().markAsTouched();

    if (!this.comercialForm().invalid()) {
      return true;
    }

    if (this.comercialForm.nombre().invalid()) {
      this.nameInput()?.nativeElement.focus();
    }

    return false;
  }

  /**
   * Valida y solicita guardar
   * el Comercial actual.
   */
  save(event: Event): void {
    event.preventDefault();

    if (!this.dirty() || this.processing()) {
      return;
    }

    if (!this.validate()) {
      return;
    }

    this.saveEvent.emit(cloneComercialFormModel(this.comercialModel()));
  }

  /**
   * Solicita cancelar la edición actual.
   */
  cancel(): void {
    const workspace: ProveedorComercialWorkspace | null = this.workspace();

    if (workspace === null || this.processing()) {
      return;
    }

    if (workspace.state === 'existing' && !this.dirty()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Solicita eliminar el Comercial
   * persistido actualmente abierto.
   */
  deleteComercial(): void {
    if (this.workspace()?.state !== 'existing' || this.processing()) {
      return;
    }

    this.deleteEvent.emit();
  }
}
