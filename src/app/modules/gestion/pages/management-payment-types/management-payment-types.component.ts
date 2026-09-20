import {
  CdkDrag,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  viewChild,
  type ElementRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import createTipoPagoDataFormInitialValue from '@model/tipos-pago/tipo-pago-data-form.initial-value';
import type { TipoPagoDataFormModel } from '@model/tipos-pago/tipo-pago-data-form.model';
import tipoPagoDataFormSchema from '@model/tipos-pago/tipo-pago-data-form.schema';
import TipoPago from '@model/tipos-pago/tipo-pago.model';
import { DialogService } from '@osumi/angular-tools';
import FilesService from '@services/application/files.service';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { getErrorMessage } from '@utils/error.utils';
import { firstValueFrom } from 'rxjs';

const EFECTIVO_SLUG: string = 'efectivo';

/**
 * Muestra y permite seleccionar los tipos de pago
 * configurables desde el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-payment-types',
  templateUrl: './management-payment-types.component.html',
  styleUrl: './management-payment-types.component.scss',
  imports: [
    RouterLink,
    FormField,
    MatButton,
    MatCheckbox,
    MatFormFieldModule,
    MatIcon,
    MatInput,
    MatTabsModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
  ],
})
export default class ManagementPaymentTypesComponent {
  private readonly tiposPagoService: TiposPagoService = inject(TiposPagoService);
  private readonly injector: Injector = inject(Injector);
  private readonly filesService: FilesService = inject(FilesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly dialog: DialogService = inject(DialogService);

  private readonly nombreInput = viewChild<ElementRef<HTMLInputElement>>('nombreInput');
  private readonly logoInput = viewChild<ElementRef<HTMLInputElement>>('logoInput');

  private destroyed: boolean = false;
  private nombreFocusPending: boolean = false;

  readonly searchTerm: WritableSignal<string> = signal<string>('');
  readonly selectedTipoPago: WritableSignal<TipoPago | null> = signal<TipoPago | null>(null);
  readonly creatingTipoPago: WritableSignal<boolean> = signal<boolean>(false);
  readonly selectedTabIndex: WritableSignal<number> = signal<number>(0);
  readonly tipoPagoDataModel: WritableSignal<TipoPagoDataFormModel> = signal<TipoPagoDataFormModel>(
    createTipoPagoDataFormInitialValue(null),
  );
  readonly savingTipoPago: WritableSignal<boolean> = signal<boolean>(false);
  readonly deletingTipoPago: WritableSignal<boolean> = signal<boolean>(false);
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);
  readonly reorderingTipoPago: Signal<boolean> = this.tiposPagoService.reordering;

  private saveFeedbackTimeoutId: number | null = null;

  readonly tipoPagoDataForm: FieldTree<TipoPagoDataFormModel> = form(
    this.tipoPagoDataModel,
    (path): void => {
      tipoPagoDataFormSchema(path);
    },
  );

  private readonly logoStagingId: WritableSignal<string | null> = signal<string | null>(null);
  readonly logoProcessing: WritableSignal<boolean> = signal<boolean>(false);
  readonly logoError: WritableSignal<string | null> = signal<string | null>(null);

  readonly hasTipoPagoDataChanges: Signal<boolean> = computed(
    (): boolean => this.tipoPagoDataForm().dirty() || this.logoStagingId() !== null,
  );

  readonly canSaveTipoPago: Signal<boolean> = computed((): boolean => {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing() ||
      this.tipoPagoDataForm().invalid()
    ) {
      return false;
    }

    if (this.creatingTipoPago()) {
      return this.logoStagingId() !== null;
    }

    return this.selectedTipoPago() !== null && this.hasTipoPagoDataChanges();
  });

  /**
   * Subconjunto configurable desde Gestión.
   *
   * Efectivo pertenece al maestro global pero es
   * estructural y no puede gestionarse desde aquí.
   */
  readonly tiposPagoConfigurables: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] =>
    this.tiposPagoService
      .tiposPago()
      .filter(
        (tipoPago: TipoPago): boolean => tipoPago.slug.toLocaleLowerCase('es-ES') !== EFECTIVO_SLUG,
      ),
  );

  readonly filteredTiposPago: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] => {
    const searchTerm: string = this.searchTerm().trim().toLocaleLowerCase('es-ES');

    if (searchTerm === '') {
      return this.tiposPagoConfigurables();
    }

    return this.tiposPagoConfigurables().filter((tipoPago: TipoPago): boolean =>
      tipoPago.nombre.toLocaleLowerCase('es-ES').includes(searchTerm),
    );
  });

  readonly canReorderTiposPago: Signal<boolean> = computed(
    (): boolean =>
      this.searchTerm().trim() === '' &&
      this.tiposPagoConfigurables().length > 1 &&
      !this.reorderingTipoPago() &&
      !this.deletingTipoPago() &&
      !this.savingTipoPago() &&
      !this.logoProcessing(),
  );

  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.destroyed = true;

      this.clearSaveFeedback();

      const stagingId: string | null = this.logoStagingId();

      if (stagingId === null) {
        return;
      }

      void Promise.allSettled([this.filesService.discardStagedImage(stagingId)]);
    });
  }

  /**
   * Actualiza el texto utilizado para
   * filtrar los tipos de pago.
   */
  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  /**
   * Persiste el nuevo orden resultante
   * de arrastrar un tipo de pago.
   */
  async reorderTiposPago(event: CdkDragDrop<readonly TipoPago[]>): Promise<void> {
    if (!this.canReorderTiposPago() || event.previousIndex === event.currentIndex) {
      return;
    }

    const reordered: TipoPago[] = [...this.tiposPagoConfigurables()];

    moveItemInArray(reordered, event.previousIndex, event.currentIndex);

    const ids: number[] = [];

    for (const tipoPago of reordered) {
      if (tipoPago.id === null) {
        this.dialog.alert({
          title: 'Error',
          content: 'No se ha podido determinar el identificador de uno de los tipos de pago.',
        });

        return;
      }

      ids.push(tipoPago.id);
    }

    const selectedId: number | null = this.selectedTipoPago()?.id ?? null;

    try {
      await this.tiposPagoService.reorder({
        ids,
      });

      /*
       * reorder() sustituye el maestro por los
       * modelos canónicos devueltos por backend.
       *
       * Si había una ficha seleccionada, actualizamos
       * su referencia sin tocar el formulario para
       * conservar posibles cambios sin guardar.
       */
      if (selectedId !== null) {
        this.selectedTipoPago.set(this.tiposPagoService.findById(selectedId));
      }
    } catch (error: unknown) {
      console.error('Error reordenando los tipos de pago:', error);

      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(
          error,
          'No se ha podido guardar el nuevo orden de los tipos de pago.',
        ),
      });
    }
  }

  /**
   * Selecciona un tipo de pago existente
   * y carga sus datos en el formulario.
   */
  async selectTipoPago(tipoPago: TipoPago): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

    this.clearSaveFeedback();
    this.creatingTipoPago.set(false);
    this.selectedTipoPago.set(tipoPago);
    this.resetTipoPagoDataForm(tipoPago);
    this.focusNombreInput();
  }

  /**
   * Abre el editor para crear un nuevo
   * tipo de pago.
   */
  async startCreatingTipoPago(): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

    this.clearSaveFeedback();
    this.selectedTipoPago.set(null);
    this.creatingTipoPago.set(true);
    this.resetTipoPagoDataForm(null);
    this.focusNombreInput();
  }

  /**
   * Descarta los cambios realizados
   * en los datos del tipo de pago.
   *
   * En un alta vuelve al estado inicial.
   * En edición restaura los datos persistidos.
   */
  async cancelTipoPagoChanges(): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

    if (this.creatingTipoPago()) {
      this.clearSaveFeedback();
      this.creatingTipoPago.set(false);
      this.selectedTipoPago.set(null);
      this.resetTipoPagoDataForm(null);

      return;
    }

    const tipoPago: TipoPago | null = this.selectedTipoPago();

    if (tipoPago !== null) {
      this.resetTipoPagoDataForm(tipoPago);
    }
  }

  /**
   * Valida y persiste el tipo de pago
   * que se está creando o editando.
   */
  async saveTipoPago(): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    if (!this.creatingTipoPago() && this.selectedTipoPago() === null) {
      return;
    }

    this.tipoPagoDataForm().markAsTouched();

    if (this.tipoPagoDataForm().invalid()) {
      return;
    }

    const data: TipoPagoDataFormModel = this.tipoPagoDataModel();

    const wasCreatingTipoPago: boolean = this.creatingTipoPago();

    this.clearSaveFeedback();

    this.savingTipoPago.set(true);

    try {
      const tipoPago: TipoPago = wasCreatingTipoPago
        ? await this.createTipoPago(data)
        : await this.updateTipoPago(data);

      /*
       * El backend ya ha promocionado el fichero
       * definitivo y consumido el staging.
       *
       * Desde este momento el componente deja
       * de ser propietario del staging temporal.
       */
      this.logoStagingId.set(null);

      this.creatingTipoPago.set(false);
      this.selectedTipoPago.set(tipoPago);

      this.resetTipoPagoDataForm(tipoPago);

      this.showSaveFeedback();
    } catch (error: unknown) {
      console.error('Error guardando el tipo de pago:', error);

      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido guardar el tipo de pago.'),
      });
    } finally {
      this.savingTipoPago.set(false);
    }
  }

  /**
   * Solicita confirmación y da de baja
   * el tipo de pago seleccionado.
   */
  async deleteTipoPago(): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing() ||
      this.creatingTipoPago()
    ) {
      return;
    }

    const tipoPago: TipoPago | null = this.selectedTipoPago();

    if (tipoPago === null || tipoPago.id === null) {
      return;
    }

    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: 'Eliminar tipo de pago',
        content:
          `¿Estás seguro de querer eliminar el tipo de pago "${tipoPago.nombre}"? ` +
          'Dejará de estar disponible para nuevas operaciones, pero se conservará en el histórico.',
        warn: true,
        ok: 'Eliminar',
        cancel: 'Cancelar',
      }),
    );

    if (!confirmed) {
      return;
    }

    const stagingId: string | null = this.logoStagingId();

    this.clearSaveFeedback();
    this.deletingTipoPago.set(true);

    try {
      await this.tiposPagoService.deactivate(tipoPago.id);

      /*
       * La baja ya está confirmada en SQLite.
       * Cerramos la ficha y dejamos de ser
       * propietarios de cualquier estado editable.
       */
      this.selectedTipoPago.set(null);
      this.creatingTipoPago.set(false);
      this.resetTipoPagoDataForm(null);

      /*
       * El staging no forma parte del tipo persistido
       * que acabamos de eliminar, por lo que debe
       * limpiarse separadamente.
       *
       * Igual que en Marcas, una incidencia limpiando
       * este temporal no revierte una baja ya confirmada.
       */
      if (stagingId !== null) {
        this.logoStagingId.set(null);

        await Promise.allSettled([this.filesService.discardStagedImage(stagingId)]);
      }
    } catch (error: unknown) {
      console.error('Error eliminando el tipo de pago:', error);

      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido eliminar el tipo de pago.'),
      });
    } finally {
      this.deletingTipoPago.set(false);
    }
  }

  /**
   * Aplica el foco pendiente en Nombre
   * cuando termina el cambio a Datos.
   */
  handleTabAnimationDone(): void {
    if (!this.nombreFocusPending) {
      return;
    }

    this.nombreFocusPending = false;

    if (this.selectedTabIndex() !== 0) {
      return;
    }

    this.nombreInput()?.nativeElement.focus();
  }

  /**
   * Abre el selector nativo para elegir
   * el logo del tipo de pago.
   */
  selectLogo(): void {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    this.logoInput()?.nativeElement.click();
  }

  /**
   * Procesa el logo seleccionado, actualiza
   * su preview y sustituye de forma segura
   * cualquier staging anterior.
   */
  async onLogoSelected(event: Event): Promise<void> {
    if (
      this.reorderingTipoPago() ||
      this.deletingTipoPago() ||
      this.savingTipoPago() ||
      this.logoProcessing()
    ) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | null = inputElement.files?.item(0) ?? null;

    /*
     * Permite volver a seleccionar
     * posteriormente el mismo fichero.
     */
    inputElement.value = '';

    if (file === null) {
      return;
    }

    const previousStagingId: string | null = this.logoStagingId();

    this.logoProcessing.set(true);
    this.logoError.set(null);

    try {
      const stagedImage: StagedImageInterface = await this.filesService.stagePaymentTypeImage(file);

      /*
       * Si la pantalla se cerró mientras
       * Sharp procesaba la imagen, limpiamos
       * inmediatamente el staging recién creado.
       */
      if (this.destroyed) {
        await Promise.allSettled([this.filesService.discardStagedImage(stagedImage.stagingId)]);

        return;
      }

      /*
       * Primero eliminamos el staging anterior.
       * Si falla, conservamos el logo anterior
       * y limpiamos también el recién creado.
       */
      if (previousStagingId !== null) {
        try {
          await this.filesService.discardStagedImage(previousStagingId);
        } catch (discardError: unknown) {
          try {
            await this.filesService.discardStagedImage(stagedImage.stagingId);
          } catch (cleanupError: unknown) {
            throw new AggregateError(
              [discardError, cleanupError],
              'No se han podido limpiar correctamente los logos temporales.',
              {
                cause: cleanupError,
              },
            );
          }

          throw discardError;
        }
      }

      this.logoStagingId.set(stagedImage.stagingId);

      this.tipoPagoDataForm.foto().value.set(stagedImage.url);
    } catch (error: unknown) {
      if (!this.destroyed) {
        this.logoError.set(this.getLogoErrorMessage(error));
      }
    } finally {
      if (!this.destroyed) {
        this.logoProcessing.set(false);
      }
    }
  }

  /**
   * Construye el comando de alta y delega
   * la persistencia en el maestro global.
   */
  private createTipoPago(data: TipoPagoDataFormModel): Promise<TipoPago> {
    const stagingId: string | null = this.logoStagingId();

    if (stagingId === null) {
      throw new Error('El logo del tipo de pago es obligatorio.');
    }

    const command: CrearTipoPagoCommand = {
      nombre: data.nombre.trim(),
      afectaCaja: data.afectaCaja,
      fisico: data.fisico,
      logoStagingId: stagingId,
    };

    return this.tiposPagoService.create(command);
  }

  /**
   * Construye el comando de edición y delega
   * la persistencia en el maestro global.
   */
  private updateTipoPago(data: TipoPagoDataFormModel): Promise<TipoPago> {
    const tipoPago: TipoPago | null = this.selectedTipoPago();

    if (tipoPago === null || tipoPago.id === null) {
      throw new Error('No hay ningún tipo de pago seleccionado para modificar.');
    }

    const command: ActualizarTipoPagoCommand = {
      nombre: data.nombre.trim(),
      afectaCaja: data.afectaCaja,
      fisico: data.fisico,

      /*
       * null significa conservar el logo
       * persistido actualmente.
       */
      logoStagingId: this.logoStagingId(),
    };

    return this.tiposPagoService.update(tipoPago.id, command);
  }

  /**
   * Muestra la pestaña Datos y pone
   * el foco en Nombre.
   */
  private focusNombreInput(): void {
    /*
     * Si ya estamos en Datos no existe
     * una transición de pestaña que pueda
     * robarnos posteriormente el foco.
     */
    if (this.selectedTabIndex() === 0) {
      afterNextRender(
        (): void => {
          this.nombreInput()?.nativeElement.focus();
        },
        {
          injector: this.injector,
        },
      );

      return;
    }

    /*
     * Si venimos de Estadísticas esperamos
     * a que Material termine la transición.
     */
    this.nombreFocusPending = true;

    this.selectedTabIndex.set(0);
  }

  /**
   * Mantiene sincronizada la pestaña activa
   * cuando el usuario cambia de pestaña.
   */
  handleTabIndexChange(index: number): void {
    this.selectedTabIndex.set(index);
  }

  /**
   * Descarta el logo temporal actualmente
   * asociado al formulario.
   */
  private async discardPendingLogo(): Promise<boolean> {
    const stagingId: string | null = this.logoStagingId();

    if (stagingId === null) {
      return true;
    }

    this.logoProcessing.set(true);

    try {
      await this.filesService.discardStagedImage(stagingId);

      this.logoStagingId.set(null);

      this.logoError.set(null);

      return true;
    } catch (error: unknown) {
      this.logoError.set(this.getLogoErrorMessage(error));

      return false;
    } finally {
      this.logoProcessing.set(false);
    }
  }

  private getLogoErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== '') {
      return error.message;
    }

    return 'No se ha podido procesar la imagen seleccionada.';
  }

  /**
   * Muestra temporalmente la confirmación
   * de que el tipo de pago se ha guardado.
   */
  private showSaveFeedback(): void {
    this.clearSaveFeedback();

    this.saveSuccessful.set(true);

    this.saveFeedbackTimeoutId = window.setTimeout((): void => {
      this.saveSuccessful.set(false);

      this.saveFeedbackTimeoutId = null;
    }, 4_000);
  }

  /**
   * Oculta la confirmación de guardado activa.
   */
  private clearSaveFeedback(): void {
    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);

      this.saveFeedbackTimeoutId = null;
    }

    this.saveSuccessful.set(false);
  }

  private resetTipoPagoDataForm(tipoPago: TipoPago | null): void {
    this.logoError.set(null);

    this.tipoPagoDataForm().reset(createTipoPagoDataFormInitialValue(tipoPago));
  }
}
