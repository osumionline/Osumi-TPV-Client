import {
  Component,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, type PageEvent } from '@angular/material/paginator';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltip } from '@angular/material/tooltip';
import { MONTH_OPTIONS, type MonthOption } from '@constants/date.constants';
import type { CaducidadCreateCommand } from '@desktop-contracts/almacen/caducidades/caducidad-create.interface';
import type { CaducidadReportConsulta } from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
  CaducidadRowInterface,
} from '@desktop-contracts/almacen/caducidades/caducidad.interface';
import { PAGE_SIZE_OPTIONS } from '@desktop-contracts/shared/pagination.constants';
import CaducidadCreateComponent from '@modules/almacen/components/caducidad-create/caducidad-create.component';
import { DialogService } from '@osumi/angular-tools';
import AlmacenService from '@services/almacen.service';
import ArticulosService from '@services/articulos.service';
import { getErrorMessage } from '@utils/error.utils';
import { formatEuros, formatInteger as formatIntegerValue } from '@utils/format.utils';
import { CADUCIDAD_COLUMNS, TEXT_SEARCH_DELAY_MS } from './caducidades.component.private';

/**
 * Muestra y filtra el histórico de pérdidas por caducidad.
 */
@Component({
  selector: 'otpv-caducidades',
  templateUrl: './caducidades.component.html',
  styleUrl: './caducidades.component.scss',
  imports: [
    CaducidadCreateComponent,
    MatButton,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatLabel,
    MatOption,
    MatPaginator,
    MatSelect,
    MatTableModule,
    MatTooltip,
  ],
})
export default class CaducidadesComponent implements OnInit, OnDestroy {
  readonly almacenService: AlmacenService = inject(AlmacenService);
  readonly articulosService: ArticulosService = inject(ArticulosService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly anio: WritableSignal<number | null> = signal<number | null>(null);
  readonly mes: WritableSignal<number | null> = signal<number | null>(null);
  readonly idMarca: WritableSignal<number | null> = signal<number | null>(null);
  readonly nombre: WritableSignal<string> = signal<string>('');
  readonly pagina: WritableSignal<number> = signal<number>(1);
  readonly num: WritableSignal<number> = signal<number>(50);
  readonly createOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly createSaving: WritableSignal<boolean> = signal<boolean>(false);
  readonly createError: WritableSignal<string | null> = signal<string | null>(null);
  readonly deactivatingCaducidadId: WritableSignal<number | null> = signal<number | null>(null);
  readonly reportOpening: WritableSignal<boolean> = signal<boolean>(false);

  readonly pageSizeOptions: readonly number[] = PAGE_SIZE_OPTIONS;
  readonly monthOptions: readonly MonthOption[] = MONTH_OPTIONS;
  readonly displayedColumns: readonly string[] = CADUCIDAD_COLUMNS;

  readonly filterOptions: WritableSignal<CaducidadFilterOptionsInterface> =
    signal<CaducidadFilterOptionsInterface>({
      anios: [],
      marcas: [],
    });

  readonly rows: WritableSignal<readonly CaducidadRowInterface[]> = signal<
    readonly CaducidadRowInterface[]
  >([]);

  readonly totalRows: WritableSignal<number> = signal<number>(0);
  readonly totalUnidades: WritableSignal<number> = signal<number>(0);
  readonly totalPvpCents: WritableSignal<number> = signal<number>(0);
  readonly totalPucMicros: WritableSignal<number> = signal<number>(0);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private requestSequence: number = 0;
  private textSearchTimeoutId: number | null = null;
  private destroyed: boolean = false;

  /**
   * Carga las opciones de filtros y la primera página.
   */
  ngOnInit(): void {
    void this.initialize();
  }

  /**
   * Cancela búsquedas pendientes al destruir el componente.
   */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestSequence++;
    this.clearTextSearchTimeout();
  }

  /**
   * Aplica el filtro por año.
   */
  onAnioChange(event: MatSelectChange): void {
    const value: number | null | undefined = this.parseOptionalInteger(event.value);

    if (value === undefined) {
      return;
    }

    this.anio.set(value);
    this.resetPageAndLoad();
  }

  /**
   * Aplica el filtro por mes.
   */
  onMesChange(event: MatSelectChange): void {
    const value: number | null | undefined = this.parseOptionalInteger(event.value);

    if (value === undefined) {
      return;
    }

    this.mes.set(value);
    this.resetPageAndLoad();
  }

  /**
   * Aplica el filtro histórico por marca.
   */
  onMarcaChange(event: MatSelectChange): void {
    const value: number | null | undefined = this.parseOptionalInteger(event.value);

    if (value === undefined) {
      return;
    }

    this.idMarca.set(value);
    this.resetPageAndLoad();
  }

  /**
   * Actualiza el nombre y programa la búsqueda remota.
   */
  onNombreInput(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.nombre.set(input.value);
    this.pagina.set(1);
    this.clearTextSearchTimeout();

    this.textSearchTimeoutId = window.setTimeout((): void => {
      this.textSearchTimeoutId = null;
      void this.loadCaducidades();
    }, TEXT_SEARCH_DELAY_MS);
  }

  /**
   * Solicita otra página del conjunto filtrado.
   */
  onPageChange(event: PageEvent): void {
    this.clearTextSearchTimeout();

    this.pagina.set(event.pageIndex + 1);
    this.num.set(event.pageSize);

    void this.loadCaducidades();
  }

  /**
   * Reintenta la carga completa tras un error.
   */
  retry(): void {
    void this.initialize();
  }

  /**
   * Conserva la identidad DOM de cada registro.
   */
  trackByCaducidad(_index: number, row: CaducidadRowInterface): number {
    return row.id;
  }

  /**
   * Formatea un número entero para presentación.
   */
  formatInteger(value: number): string {
    return formatIntegerValue(value);
  }

  /**
   * Formatea un importe almacenado en céntimos.
   */
  formatCents(value: number): string {
    return formatEuros(value / 100);
  }

  /**
   * Formatea un importe almacenado en microeuros.
   */
  formatMicros(value: number): string {
    return formatEuros(value / 1_000_000);
  }

  /**
   * Abre el formulario de una nueva caducidad.
   */
  openCreate(): void {
    if (this.createSaving() || this.deactivatingCaducidadId() !== null || this.reportOpening()) {
      return;
    }

    this.createError.set(null);
    this.createOpen.set(true);
  }

  /**
   * Cierra el formulario de alta.
   */
  closeCreate(): void {
    if (this.createSaving()) {
      return;
    }

    this.createError.set(null);
    this.createOpen.set(false);
  }

  /**
   * Registra la caducidad y refresca los datos
   * canónicos afectados.
   */
  async createCaducidad(command: CaducidadCreateCommand): Promise<void> {
    if (this.createSaving()) {
      return;
    }

    this.createSaving.set(true);
    this.createError.set(null);

    try {
      await this.almacenService.createCaducidad(command);

      this.createOpen.set(false);

      try {
        await this.articulosService.sincronizarInventarioPersistido([command.idArticulo]);
      } catch (error: unknown) {
        this.dialog
          .alert({
            title: 'Atención',
            content: getErrorMessage(
              error,
              'La caducidad se ha guardado, pero no se ha podido actualizar completamente la ficha abierta del artículo.',
            ),
          })
          .subscribe();
      }

      this.pagina.set(1);

      await this.initialize();
    } catch (error: unknown) {
      this.createError.set(getErrorMessage(error, 'No se ha podido registrar la caducidad.'));
    } finally {
      this.createSaving.set(false);
    }
  }

  /**
   * Abre el informe usando exactamente los filtros
   * activos en el momento del clic.
   */
  async openReport(): Promise<void> {
    if (
      this.loading() ||
      this.createSaving() ||
      this.deactivatingCaducidadId() !== null ||
      this.reportOpening()
    ) {
      return;
    }

    this.reportOpening.set(true);

    try {
      await this.almacenService.openCaducidadReport(this.createReportConsulta());
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido crear el informe de caducidades.'),
        })
        .subscribe();
    } finally {
      this.reportOpening.set(false);
    }
  }

  /**
   * Solicita confirmación antes de revertir una caducidad.
   */
  deactivateCaducidad(row: CaducidadRowInterface): void {
    if (
      this.loading() ||
      this.createSaving() ||
      this.deactivatingCaducidadId() !== null ||
      this.reportOpening()
    ) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Eliminar caducidad',
        content:
          `¿Estás seguro de querer eliminar la caducidad de "${row.nombre}"? ` +
          `Se devolverán ${this.formatInteger(row.unidades)} unidades al stock del artículo ` +
          'y se conservará el histórico de la reversión.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.confirmDeactivateCaducidad(row);
      });
  }

  /**
   * Ejecuta una reversión previamente confirmada y
   * sincroniza el estado canónico del artículo.
   */
  private async confirmDeactivateCaducidad(row: CaducidadRowInterface): Promise<void> {
    if (this.createSaving() || this.deactivatingCaducidadId() !== null) {
      return;
    }

    this.deactivatingCaducidadId.set(row.id);

    try {
      await this.almacenService.deactivateCaducidad(row.id);

      try {
        await this.articulosService.sincronizarInventarioPersistido([row.idArticulo]);
      } catch (error: unknown) {
        this.dialog
          .alert({
            title: 'Atención',
            content: getErrorMessage(
              error,
              'La caducidad se ha eliminado, pero no se ha podido actualizar completamente la ficha abierta del artículo.',
            ),
          })
          .subscribe();
      }

      if (this.rows().length === 1 && this.pagina() > 1) {
        this.pagina.update((pagina: number): number => pagina - 1);
      }

      await this.initialize();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar la caducidad.'),
        })
        .subscribe();
    } finally {
      this.deactivatingCaducidadId.set(null);
    }
  }

  /**
   * Carga filtros disponibles y resultados iniciales.
   */
  private async initialize(): Promise<void> {
    this.clearTextSearchTimeout();
    this.error.set(null);
    this.loading.set(true);

    const requestId: number = ++this.requestSequence;

    try {
      const [filterOptions, result]: [CaducidadFilterOptionsInterface, CaducidadResultado] =
        await Promise.all([
          this.almacenService.getCaducidadFilterOptions(),
          this.almacenService.searchCaducidades(this.createConsulta()),
        ]);

      if (this.destroyed || requestId !== this.requestSequence) {
        return;
      }

      this.filterOptions.set(filterOptions);
      this.applyResult(result);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.requestSequence) {
        return;
      }

      this.clearResult();

      this.error.set(getErrorMessage(error, 'No se han podido cargar las caducidades.'));
    } finally {
      if (!this.destroyed && requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Consulta una página utilizando los filtros actuales.
   */
  private async loadCaducidades(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);

    const requestId: number = ++this.requestSequence;

    try {
      const result: CaducidadResultado = await this.almacenService.searchCaducidades(
        this.createConsulta(),
      );

      if (this.destroyed || requestId !== this.requestSequence) {
        return;
      }

      this.applyResult(result);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.requestSequence) {
        return;
      }

      this.clearResult();

      this.error.set(getErrorMessage(error, 'No se han podido cargar las caducidades.'));
    } finally {
      if (!this.destroyed && requestId === this.requestSequence) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Construye los filtros del informe a partir
   * del estado visible actual.
   */
  private createReportConsulta(): CaducidadReportConsulta {
    return {
      anio: this.anio(),
      mes: this.mes(),
      idMarca: this.idMarca(),
      nombre: this.nombre(),
    };
  }

  /**
   * Construye la consulta correspondiente al estado actual.
   */
  private createConsulta(): CaducidadConsulta {
    return {
      anio: this.anio(),
      mes: this.mes(),
      idMarca: this.idMarca(),
      nombre: this.nombre(),
      pagina: this.pagina(),
      num: this.num(),
    };
  }

  /**
   * Aplica un resultado persistido al estado de pantalla.
   */
  private applyResult(result: CaducidadResultado): void {
    this.rows.set(result.rows);
    this.totalRows.set(result.totalRows);
    this.totalUnidades.set(result.totalUnidades);
    this.totalPvpCents.set(result.totalPvpCents);
    this.totalPucMicros.set(result.totalPucMicros);
  }

  /**
   * Vacía el resultado mostrado tras un error.
   */
  private clearResult(): void {
    this.rows.set([]);
    this.totalRows.set(0);
    this.totalUnidades.set(0);
    this.totalPvpCents.set(0);
    this.totalPucMicros.set(0);
  }

  /**
   * Reinicia la paginación y ejecuta una consulta.
   */
  private resetPageAndLoad(): void {
    this.clearTextSearchTimeout();
    this.pagina.set(1);

    void this.loadCaducidades();
  }

  /**
   * Convierte un valor de selector en entero opcional.
   */
  private parseOptionalInteger(value: unknown): number | null | undefined {
    if (value === null) {
      return null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      return undefined;
    }

    return value;
  }

  /**
   * Cancela la búsqueda de nombre pendiente.
   */
  private clearTextSearchTimeout(): void {
    if (this.textSearchTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.textSearchTimeoutId);

    this.textSearchTimeoutId = null;
  }
}
