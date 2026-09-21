import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
  type ElementRef,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, form, FormField, readonly as readonlyField } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type { SalidaCajaInterface } from '@desktop-contracts/caja/salida-caja.interface';
import createSalidaCajaFormInitialValue from '@model/caja/salida-caja-form.initial-value';
import type SalidaCajaFormModel from '@model/caja/salida-caja-form.model';
import salidaCajaFormSchema from '@model/caja/salida-caja-form.schema';
import { DialogService } from '@osumi/angular-tools';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import CajaSalidasService from '@services/caja/caja-salidas.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { getErrorMessage } from '@utils/error.utils';
import { eurosToCents } from '@utils/money.utils';
import { firstValueFrom } from 'rxjs';

type CashOutflowsFilterMode = 'fecha' | 'rango';

/**
 * Gestiona las salidas manuales de efectivo de Caja.
 */
@Component({
  selector: 'otpv-cash-outflows',
  templateUrl: './cash-outflows.component.html',
  styleUrl: './cash-outflows.component.scss',
  imports: [
    CentsToEurosPipe,
    CurrencyPipe,
    DatePipe,
    FormField,
    MatButton,
    MatFormFieldModule,
    MatIcon,
    MatIconButton,
    MatInput,
    MatTooltip,
  ],
})
export default class CashOutflowsComponent implements OnInit {
  private readonly cajaSalidasService: CajaSalidasService = inject(CajaSalidasService);
  private readonly dialog: DialogService = inject(DialogService);
  private readonly injector: Injector = inject(Injector);

  readonly ventasContextService: VentasContextService = inject(VentasContextService);

  private readonly conceptoInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('conceptoInput');

  readonly filterMode: WritableSignal<CashOutflowsFilterMode> =
    signal<CashOutflowsFilterMode>('fecha');

  readonly fecha: WritableSignal<string> = signal<string>('');
  readonly desde: WritableSignal<string> = signal<string>('');
  readonly hasta: WritableSignal<string> = signal<string>('');

  readonly salidas: WritableSignal<readonly SalidaCajaInterface[]> = signal<
    readonly SalidaCajaInterface[]
  >([]);

  readonly selectedSalida: WritableSignal<SalidaCajaInterface | null> =
    signal<SalidaCajaInterface | null>(null);

  readonly creatingSalida: WritableSignal<boolean> = signal<boolean>(false);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);
  readonly deleting: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly salidaCajaDataModel: WritableSignal<SalidaCajaFormModel> = signal<SalidaCajaFormModel>(
    createSalidaCajaFormInitialValue(),
  );
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  private saveFeedbackTimeoutId: number | null = null;

  readonly hasEditor: Signal<boolean> = computed(
    (): boolean => this.creatingSalida() || this.selectedSalida() !== null,
  );

  readonly formEditable: Signal<boolean> = computed((): boolean => {
    if (this.ventasContextService.cajaAbierta() === null) {
      return false;
    }

    if (this.creatingSalida()) {
      return true;
    }

    return this.selectedSalida()?.editable === true;
  });

  readonly salidaCajaForm: FieldTree<SalidaCajaFormModel> = form(
    this.salidaCajaDataModel,
    (path): void => {
      salidaCajaFormSchema(path);

      readonlyField(path.concepto, {
        when: (): boolean => !this.formEditable(),
      });

      readonlyField(path.descripcion, {
        when: (): boolean => !this.formEditable(),
      });

      readonlyField(path.importeEuros, {
        when: (): boolean => !this.formEditable(),
      });
    },
  );

  readonly canSearchRange: Signal<boolean> = computed((): boolean => {
    const desde: string = this.desde();
    const hasta: string = this.hasta();

    return desde.length > 0 && hasta.length > 0 && desde <= hasta;
  });

  readonly canSave: Signal<boolean> = computed(
    (): boolean =>
      this.formEditable() &&
      !this.saving() &&
      !this.deleting() &&
      !this.salidaCajaForm().invalid() &&
      this.salidaCajaForm().dirty(),
  );

  readonly canDelete: Signal<boolean> = computed(
    (): boolean =>
      !this.creatingSalida() &&
      this.selectedSalida()?.editable === true &&
      this.ventasContextService.cajaAbierta() !== null &&
      !this.saving() &&
      !this.deleting(),
  );

  private loadRequestId: number = 0;

  /**
   * Inicializa los filtros a hoy, refresca el contexto
   * operativo y carga las salidas del día actual.
   */
  ngOnInit(): void {
    const today: string = this.getTodayLocalDate();

    this.fecha.set(today);
    this.desde.set(today);
    this.hasta.set(today);

    void this.initialize();
  }

  /**
   * Cambia entre consulta por fecha y consulta por rango.
   */
  selectFilterMode(mode: CashOutflowsFilterMode): void {
    if (this.filterMode() === mode) {
      return;
    }

    this.filterMode.set(mode);
    this.error.set(null);

    if (mode === 'fecha') {
      void this.loadFecha();
    }
  }

  /**
   * Actualiza el día consultado y carga sus salidas.
   */
  onFechaChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    if (input.value.length === 0) {
      return;
    }

    this.fecha.set(input.value);

    void this.loadFecha();
  }

  /**
   * Actualiza el inicio del rango sin consultar todavía.
   */
  onDesdeChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.desde.set(input.value);
  }

  /**
   * Actualiza el final del rango sin consultar todavía.
   */
  onHastaChange(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.hasta.set(input.value);
  }

  /**
   * Avanza o retrocede la fecha activa.
   */
  moveFecha(days: number): void {
    this.fecha.set(this.shiftLocalDate(this.fecha(), days));

    void this.loadFecha();
  }

  /**
   * Consulta las salidas del día seleccionado.
   */
  async loadFecha(): Promise<void> {
    const fecha: string = this.fecha();

    if (fecha.length === 0) {
      return;
    }

    await this.loadSalidas(fecha, fecha);
  }

  /**
   * Consulta las salidas comprendidas en el rango seleccionado.
   */
  async searchRange(): Promise<void> {
    if (!this.canSearchRange()) {
      this.error.set('La fecha inicial no puede ser posterior a la fecha final.');

      return;
    }

    await this.loadSalidas(this.desde(), this.hasta());
  }

  /**
   * Abre en el formulario una salida existente.
   */
  selectSalida(salida: SalidaCajaInterface): void {
    if (this.saving() || this.deleting()) {
      return;
    }

    this.clearSaveFeedback();
    this.creatingSalida.set(false);
    this.selectedSalida.set(salida);
    this.salidaCajaForm().reset(createSalidaCajaFormInitialValue(salida));
  }

  /**
   * Prepara un formulario vacío para registrar una nueva salida.
   */
  startCreatingSalida(): void {
    if (this.ventasContextService.cajaAbierta() === null || this.saving() || this.deleting()) {
      return;
    }

    this.clearSaveFeedback();
    this.selectedSalida.set(null);
    this.creatingSalida.set(true);
    this.salidaCajaForm().reset(createSalidaCajaFormInitialValue());

    afterNextRender(
      (): void => {
        this.conceptoInput()?.nativeElement.focus();
      },
      {
        injector: this.injector,
      },
    );
  }

  /**
   * Restaura los valores originales del formulario actual.
   */
  cancelSalidaChanges(): void {
    if (!this.hasEditor() || this.saving() || this.deleting()) {
      return;
    }

    this.clearSaveFeedback();
    if (this.creatingSalida()) {
      this.salidaCajaForm().reset(createSalidaCajaFormInitialValue());

      return;
    }

    this.salidaCajaForm().reset(createSalidaCajaFormInitialValue(this.selectedSalida()));
  }

  /**
   * Crea o actualiza la salida actualmente editada.
   */
  async saveSalida(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.hasEditor() || !this.formEditable() || this.saving() || this.deleting()) {
      return;
    }

    this.salidaCajaForm().markAsTouched();

    if (this.salidaCajaForm().invalid()) {
      return;
    }

    const caja = this.ventasContextService.cajaAbierta();

    if (caja === null) {
      return;
    }

    const data: SalidaCajaFormModel = this.salidaCajaDataModel();

    const descripcion: string = data.descripcion.trim();

    this.clearSaveFeedback();
    this.saving.set(true);

    try {
      let persisted: SalidaCajaInterface;

      if (this.creatingSalida()) {
        const command: CrearSalidaCajaCommand = {
          cajaPublicId: caja.publicId,
          concepto: data.concepto.trim(),
          descripcion: descripcion === '' ? null : descripcion,
          importeCents: eurosToCents(data.importeEuros),
        };

        persisted = await this.cajaSalidasService.createSalida(command);

        await this.refreshAfterCreate(persisted);
      } else {
        const selectedSalida: SalidaCajaInterface | null = this.selectedSalida();

        if (selectedSalida === null || !selectedSalida.editable) {
          return;
        }

        const command: ActualizarSalidaCajaCommand = {
          publicId: selectedSalida.publicId,
          cajaPublicId: caja.publicId,
          concepto: data.concepto.trim(),
          descripcion: descripcion === '' ? null : descripcion,
          importeCents: eurosToCents(data.importeEuros),
        };

        persisted = await this.cajaSalidasService.updateSalida(command);

        this.salidas.update(
          (salidas: readonly SalidaCajaInterface[]): readonly SalidaCajaInterface[] =>
            salidas.map((salida: SalidaCajaInterface): SalidaCajaInterface =>
              salida.publicId === persisted.publicId ? persisted : salida,
            ),
        );

        this.selectedSalida.set(persisted);
        this.salidaCajaForm().reset(createSalidaCajaFormInitialValue(persisted));
      }

      this.showSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar la salida de caja.'),
        })
        .subscribe();
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Solicita confirmación y elimina lógicamente
   * la salida seleccionada.
   */
  async deleteSalida(): Promise<void> {
    const salida: SalidaCajaInterface | null = this.selectedSalida();
    const caja = this.ventasContextService.cajaAbierta();

    if (salida === null || caja === null || !this.canDelete()) {
      return;
    }

    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: 'Eliminar salida de caja',
        content: `¿Estás seguro de querer eliminar la salida de caja "${salida.concepto}"?`,
        warn: true,
        ok: 'Eliminar',
        cancel: 'Cancelar',
      }),
    );

    if (!confirmed) {
      return;
    }

    this.clearSaveFeedback();
    this.deleting.set(true);

    try {
      await this.cajaSalidasService.deleteSalida({
        publicId: salida.publicId,
        cajaPublicId: caja.publicId,
      });

      await firstValueFrom(
        this.dialog.alert({
          title: 'Salida de caja eliminada',
          content: `La salida de caja "${salida.concepto}" se ha eliminado correctamente.`,
        }),
      );

      this.clearEditor();

      await this.refreshCurrentSearch();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar la salida de caja.'),
        })
        .subscribe();
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Muestra temporalmente la confirmación
   * de que la salida se ha guardado.
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
   * Oculta cualquier confirmación de guardado todavía visible.
   */
  private clearSaveFeedback(): void {
    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);
      this.saveFeedbackTimeoutId = null;
    }

    this.saveSuccessful.set(false);
  }

  /**
   * Refresca el contexto operativo y las salidas iniciales.
   */
  private async initialize(): Promise<void> {
    const [contextResult] = await Promise.allSettled([
      this.ventasContextService.reload(),
      this.loadFecha(),
    ]);

    if (contextResult.status === 'rejected') {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            contextResult.reason,
            'No se ha podido determinar el estado actual de la caja.',
          ),
        })
        .subscribe();
    }
  }

  /**
   * Recupera las salidas de un intervalo evitando
   * que una respuesta antigua sustituya otra más reciente.
   */
  private async loadSalidas(desde: string, hasta: string): Promise<void> {
    const requestId: number = ++this.loadRequestId;

    this.loading.set(true);
    this.error.set(null);
    this.clearEditor();

    try {
      const salidas: readonly SalidaCajaInterface[] = await this.cajaSalidasService.getSalidas({
        desde,
        hasta,
      });

      if (requestId !== this.loadRequestId) {
        return;
      }

      this.salidas.set(salidas);
    } catch (error: unknown) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.salidas.set([]);
      this.error.set(getErrorMessage(error, 'No se han podido recuperar las salidas de caja.'));
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Después de un alta vuelve a hoy, actualiza el listado
   * y deja seleccionada la salida recién creada.
   */
  private async refreshAfterCreate(persisted: SalidaCajaInterface): Promise<void> {
    const today: string = this.getTodayLocalDate();

    if (this.filterMode() === 'fecha') {
      this.fecha.set(today);

      await this.loadSalidas(today, today);
    } else {
      this.desde.set(today);
      this.hasta.set(today);

      await this.loadSalidas(today, today);
    }

    /*
     * La escritura SQLite ya ha terminado, por lo que normalmente
     * la consulta anterior contendrá el registro. Conservamos este
     * fallback para que la UI siga siendo coherente ante cualquier
     * respuesta inesperadamente incompleta.
     */
    if (
      !this.salidas().some(
        (salida: SalidaCajaInterface): boolean => salida.publicId === persisted.publicId,
      )
    ) {
      this.salidas.update(
        (salidas: readonly SalidaCajaInterface[]): readonly SalidaCajaInterface[] => [
          persisted,
          ...salidas,
        ],
      );
    }

    this.creatingSalida.set(false);
    this.selectedSalida.set(persisted);
    this.salidaCajaForm().reset(createSalidaCajaFormInitialValue(persisted));
  }

  /**
   * Refresca el filtro actualmente visible.
   */
  private async refreshCurrentSearch(): Promise<void> {
    if (this.filterMode() === 'fecha') {
      await this.loadFecha();

      return;
    }

    await this.searchRange();
  }

  /**
   * Cierra el editor y restaura un formulario vacío.
   */
  private clearEditor(): void {
    this.selectedSalida.set(null);
    this.creatingSalida.set(false);
    this.salidaCajaForm().reset(createSalidaCajaFormInitialValue());
  }

  /**
   * Devuelve la fecha civil local actual.
   */
  private getTodayLocalDate(): string {
    return this.formatLocalDate(new Date());
  }

  /**
   * Desplaza una fecha civil manteniendo calendario local.
   */
  private shiftLocalDate(value: string, days: number): string {
    const parts: readonly string[] = value.split('-');

    if (parts.length !== 3) {
      return value;
    }

    const date: Date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    date.setDate(date.getDate() + days);

    return this.formatLocalDate(date);
  }

  /**
   * Formatea una fecha local como YYYY-MM-DD.
   */
  private formatLocalDate(date: Date): string {
    const year: string = String(date.getFullYear());
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
