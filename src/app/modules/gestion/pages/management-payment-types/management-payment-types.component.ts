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
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import createTipoPagoDataFormInitialValue from '@model/tipos-pago/tipo-pago-data-form.initial-value';
import type { TipoPagoDataFormModel } from '@model/tipos-pago/tipo-pago-data-form.model';
import tipoPagoDataFormSchema from '@model/tipos-pago/tipo-pago-data-form.schema';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import FilesService from '@services/application/files.service';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';

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
  ],
})
export default class ManagementPaymentTypesComponent {
  private readonly tiposPagoService: TiposPagoService = inject(TiposPagoService);
  private readonly injector: Injector = inject(Injector);
  private readonly filesService: FilesService = inject(FilesService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

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

  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.destroyed = true;

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
   * Selecciona un tipo de pago existente
   * y carga sus datos en el formulario.
   */
  async selectTipoPago(tipoPago: TipoPago): Promise<void> {
    if (this.logoProcessing()) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

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
    if (this.logoProcessing()) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

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
    if (this.logoProcessing()) {
      return;
    }

    if (this.logoStagingId() !== null) {
      const discarded: boolean = await this.discardPendingLogo();

      if (!discarded) {
        return;
      }
    }

    if (this.creatingTipoPago()) {
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
    if (this.logoProcessing()) {
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
    if (this.logoProcessing()) {
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

  private resetTipoPagoDataForm(tipoPago: TipoPago | null): void {
    this.logoError.set(null);

    this.tipoPagoDataForm().reset(createTipoPagoDataFormInitialValue(tipoPago));
  }
}
