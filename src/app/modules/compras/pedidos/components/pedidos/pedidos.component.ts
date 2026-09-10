import {
  Component,
  computed,
  inject,
  signal,
  type OnDestroy,
  type OnInit,
  type Signal,
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
import { Router } from '@angular/router';
import type {
  PedidoFilterOptionsInterface,
  PedidoGuardadoRowInterface,
  PedidoListadoConsulta,
  PedidoRecepcionadoRowInterface,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import { PAGE_SIZE_OPTIONS } from '@desktop-contracts/shared/pagination.constants';
import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';
import {
  createPedidoListadoDefaultState,
  formatPedidoDate as formatPedidoDateValue,
  formatPedidoTipo as formatPedidoTipoValue,
  hasPedidoListadoFilters,
  parsePedidoFilterAmountMicros,
  PEDIDOS_GUARDADOS_COLUMNS,
  PEDIDOS_RECEPCIONADOS_COLUMNS,
} from '@modules/compras/pedidos/components/pedidos/pedidos.component.private';
import { DialogService } from '@osumi/angular-tools';
import ComprasWorkspaceService from '@services/compras-workspace.service';
import ComprasService from '@services/compras.service';
import { getErrorMessage } from '@utils/error.utils';
import { formatEuros } from '@utils/format.utils';

/**
 * Muestra los pedidos pendientes y recepcionados.
 */
@Component({
  selector: 'otpv-pedidos',
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.scss',
  imports: [
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
export default class PedidosComponent implements OnInit, OnDestroy {
  private readonly comprasService: ComprasService = inject(ComprasService);
  private readonly comprasWorkspaceService: ComprasWorkspaceService =
    inject(ComprasWorkspaceService);
  private readonly dialog: DialogService = inject(DialogService);
  private readonly router: Router = inject(Router);

  readonly guardadosState: WritableSignal<PedidoListadoWorkspaceState> =
    signal<PedidoListadoWorkspaceState>(
      this.comprasWorkspaceService.getPedidosGuardadosState() ?? createPedidoListadoDefaultState(),
    );
  readonly recepcionadosState: WritableSignal<PedidoListadoWorkspaceState> =
    signal<PedidoListadoWorkspaceState>(
      this.comprasWorkspaceService.getPedidosRecepcionadosState() ??
        createPedidoListadoDefaultState(),
    );

  readonly filterOptions: WritableSignal<PedidoFilterOptionsInterface> =
    signal<PedidoFilterOptionsInterface>({
      proveedores: [],
    });

  readonly guardadosRows: WritableSignal<readonly PedidoGuardadoRowInterface[]> = signal<
    readonly PedidoGuardadoRowInterface[]
  >([]);
  readonly recepcionadosRows: WritableSignal<readonly PedidoRecepcionadoRowInterface[]> = signal<
    readonly PedidoRecepcionadoRowInterface[]
  >([]);
  readonly guardadosTotalRows: WritableSignal<number> = signal<number>(0);
  readonly recepcionadosTotalRows: WritableSignal<number> = signal<number>(0);

  readonly guardadosLoading: WritableSignal<boolean> = signal<boolean>(true);
  readonly recepcionadosLoading: WritableSignal<boolean> = signal<boolean>(true);
  readonly filterOptionsLoading: WritableSignal<boolean> = signal<boolean>(true);
  readonly guardadosError: WritableSignal<string | null> = signal<string | null>(null);
  readonly recepcionadosError: WritableSignal<string | null> = signal<string | null>(null);

  readonly showGuardadosFilters: WritableSignal<boolean> = signal<boolean>(false);
  readonly showRecepcionadosFilters: WritableSignal<boolean> = signal<boolean>(false);

  readonly guardadosFiltered: Signal<boolean> = computed((): boolean =>
    hasPedidoListadoFilters(this.guardadosState()),
  );
  readonly recepcionadosFiltered: Signal<boolean> = computed((): boolean =>
    hasPedidoListadoFilters(this.recepcionadosState()),
  );

  readonly pageSizeOptions: readonly number[] = PAGE_SIZE_OPTIONS;
  readonly guardadosColumns: readonly string[] = PEDIDOS_GUARDADOS_COLUMNS;
  readonly recepcionadosColumns: readonly string[] = PEDIDOS_RECEPCIONADOS_COLUMNS;

  private guardadosRequestSequence: number = 0;
  private recepcionadosRequestSequence: number = 0;
  private destroyed: boolean = false;

  /**
   * Carga filtros y ambos listados.
   */
  ngOnInit(): void {
    void this.initialize();
  }

  /**
   * Conserva el workspace y descarta respuestas tardías.
   */
  ngOnDestroy(): void {
    this.persistWorkspaceState();

    this.destroyed = true;
    this.guardadosRequestSequence++;
    this.recepcionadosRequestSequence++;
  }

  /**
   * Alterna la visibilidad de los filtros de pedidos guardados.
   */
  toggleGuardadosFilters(): void {
    this.showGuardadosFilters.update((value: boolean): boolean => !value);
  }

  /**
   * Alterna la visibilidad de los filtros de pedidos recepcionados.
   */
  toggleRecepcionadosFilters(): void {
    this.showRecepcionadosFilters.update((value: boolean): boolean => !value);
  }

  /**
   * Actualiza un campo textual del filtro de pedidos guardados.
   */
  onGuardadosFilterInput(
    field: 'fechaDesde' | 'fechaHasta' | 'numero' | 'importeDesde' | 'importeHasta',
    event: Event,
  ): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.guardadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        [field]: input.value,
      }),
    );
  }

  /**
   * Actualiza un campo textual del filtro de pedidos recepcionados.
   */
  onRecepcionadosFilterInput(
    field: 'fechaDesde' | 'fechaHasta' | 'numero' | 'importeDesde' | 'importeHasta',
    event: Event,
  ): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    this.recepcionadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        [field]: input.value,
      }),
    );
  }

  /**
   * Actualiza el proveedor de pedidos guardados.
   */
  onGuardadosProveedorChange(event: MatSelectChange): void {
    this.guardadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        idProveedor: this.parseOptionalProviderId(event.value),
      }),
    );
  }

  /**
   * Actualiza el proveedor de pedidos recepcionados.
   */
  onRecepcionadosProveedorChange(event: MatSelectChange): void {
    this.recepcionadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        idProveedor: this.parseOptionalProviderId(event.value),
      }),
    );
  }

  /**
   * Aplica los filtros visibles de pedidos guardados.
   */
  applyGuardadosFilters(event: Event): void {
    event.preventDefault();

    this.guardadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        pagina: 1,
      }),
    );
    this.showGuardadosFilters.set(false);

    void this.loadGuardados();
  }

  /**
   * Aplica los filtros visibles de pedidos recepcionados.
   */
  applyRecepcionadosFilters(event: Event): void {
    event.preventDefault();

    this.recepcionadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        pagina: 1,
      }),
    );
    this.showRecepcionadosFilters.set(false);

    void this.loadRecepcionados();
  }

  /**
   * Elimina todos los filtros de pedidos guardados manteniendo el tamaño de página.
   */
  clearGuardadosFilters(): void {
    const num: number = this.guardadosState().num;

    this.guardadosState.set({
      ...createPedidoListadoDefaultState(),
      num,
    });
    this.showGuardadosFilters.set(false);

    void this.loadGuardados();
  }

  /**
   * Elimina todos los filtros de pedidos recepcionados manteniendo el tamaño de página.
   */
  clearRecepcionadosFilters(): void {
    const num: number = this.recepcionadosState().num;

    this.recepcionadosState.set({
      ...createPedidoListadoDefaultState(),
      num,
    });
    this.showRecepcionadosFilters.set(false);

    void this.loadRecepcionados();
  }

  /**
   * Solicita otra página de pedidos guardados.
   */
  onGuardadosPageChange(event: PageEvent): void {
    this.guardadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        pagina: event.pageIndex + 1,
        num: event.pageSize,
      }),
    );

    void this.loadGuardados();
  }

  /**
   * Solicita otra página de pedidos recepcionados.
   */
  onRecepcionadosPageChange(event: PageEvent): void {
    this.recepcionadosState.update(
      (state: PedidoListadoWorkspaceState): PedidoListadoWorkspaceState => ({
        ...state,
        pagina: event.pageIndex + 1,
        num: event.pageSize,
      }),
    );

    void this.loadRecepcionados();
  }

  /**
   * Reintenta la carga de pedidos guardados.
   */
  retryGuardados(): void {
    void this.loadGuardados();
  }

  /**
   * Reintenta la carga de pedidos recepcionados.
   */
  retryRecepcionados(): void {
    void this.loadRecepcionados();
  }

  /**
   * Abre la futura ficha de un nuevo pedido.
   */
  openNewPedido(): void {
    this.persistWorkspaceState();

    void this.router.navigate(['/compras/pedido']);
  }

  /**
   * Abre la futura ficha de un pedido persistido.
   */
  openPedido(idPedido: number): void {
    this.persistWorkspaceState();

    void this.router.navigate(['/compras/pedido', idPedido]);
  }

  /**
   * Mantiene estable la identidad DOM de los pedidos.
   */
  trackByPedido(
    _index: number,
    row: PedidoGuardadoRowInterface | PedidoRecepcionadoRowInterface,
  ): number {
    return row.id;
  }

  /**
   * Formatea una fecha documental.
   */
  formatDate(value: string | null): string {
    return formatPedidoDateValue(value);
  }

  /**
   * Formatea el tipo documental junto a su número.
   */
  formatTipo(row: PedidoGuardadoRowInterface | PedidoRecepcionadoRowInterface): string {
    return formatPedidoTipoValue(row.tipo, row.numero);
  }

  /**
   * Formatea un importe expresado en microeuros.
   */
  formatMicros(value: number): string {
    return formatEuros(value / 1_000_000);
  }

  /**
   * Carga las opciones de filtros y los dos listados en paralelo.
   */
  private async initialize(): Promise<void> {
    await Promise.all([this.loadFilterOptions(), this.loadGuardados(), this.loadRecepcionados()]);
  }

  /**
   * Recupera los proveedores utilizables en los filtros.
   */
  private async loadFilterOptions(): Promise<void> {
    this.filterOptionsLoading.set(true);

    try {
      const result: PedidoFilterOptionsInterface =
        await this.comprasService.getPedidoFilterOptions();

      if (!this.destroyed) {
        this.filterOptions.set(result);
      }
    } catch (error: unknown) {
      if (!this.destroyed) {
        this.dialog
          .alert({
            title: 'Error',
            content: getErrorMessage(
              error,
              'No se han podido cargar los proveedores de los filtros de Pedidos.',
            ),
          })
          .subscribe();
      }
    } finally {
      if (!this.destroyed) {
        this.filterOptionsLoading.set(false);
      }
    }
  }

  /**
   * Carga una página de pedidos pendientes.
   */
  private async loadGuardados(): Promise<void> {
    this.guardadosLoading.set(true);
    this.guardadosError.set(null);

    const requestId: number = ++this.guardadosRequestSequence;

    try {
      const result: PedidosGuardadosResultado = await this.comprasService.searchPedidosGuardados(
        this.createConsulta(this.guardadosState()),
      );

      if (this.destroyed || requestId !== this.guardadosRequestSequence) {
        return;
      }

      this.guardadosRows.set(result.rows);
      this.guardadosTotalRows.set(result.totalRows);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.guardadosRequestSequence) {
        return;
      }

      this.guardadosRows.set([]);
      this.guardadosTotalRows.set(0);
      this.guardadosError.set(
        getErrorMessage(error, 'No se han podido cargar los pedidos guardados.'),
      );
    } finally {
      if (!this.destroyed && requestId === this.guardadosRequestSequence) {
        this.guardadosLoading.set(false);
      }
    }
  }

  /**
   * Carga una página de pedidos recepcionados.
   */
  private async loadRecepcionados(): Promise<void> {
    this.recepcionadosLoading.set(true);
    this.recepcionadosError.set(null);

    const requestId: number = ++this.recepcionadosRequestSequence;

    try {
      const result: PedidosRecepcionadosResultado =
        await this.comprasService.searchPedidosRecepcionados(
          this.createConsulta(this.recepcionadosState()),
        );

      if (this.destroyed || requestId !== this.recepcionadosRequestSequence) {
        return;
      }

      this.recepcionadosRows.set(result.rows);
      this.recepcionadosTotalRows.set(result.totalRows);
    } catch (error: unknown) {
      if (this.destroyed || requestId !== this.recepcionadosRequestSequence) {
        return;
      }

      this.recepcionadosRows.set([]);
      this.recepcionadosTotalRows.set(0);
      this.recepcionadosError.set(
        getErrorMessage(error, 'No se han podido cargar los pedidos recepcionados.'),
      );
    } finally {
      if (!this.destroyed && requestId === this.recepcionadosRequestSequence) {
        this.recepcionadosLoading.set(false);
      }
    }
  }

  /**
   * Convierte el estado visual de filtros al contrato IPC.
   */
  private createConsulta(state: PedidoListadoWorkspaceState): PedidoListadoConsulta {
    return {
      fechaDesde: state.fechaDesde === '' ? null : state.fechaDesde,
      fechaHasta: state.fechaHasta === '' ? null : state.fechaHasta,
      idProveedor: state.idProveedor,
      numero: state.numero,
      importeDesdeMicros: parsePedidoFilterAmountMicros(state.importeDesde),
      importeHastaMicros: parsePedidoFilterAmountMicros(state.importeHasta),
      pagina: state.pagina,
      num: state.num,
    };
  }

  /**
   * Conserva ambos listados para posteriores visitas durante la sesión.
   */
  private persistWorkspaceState(): void {
    this.comprasWorkspaceService.setPedidosGuardadosState(this.guardadosState());
    this.comprasWorkspaceService.setPedidosRecepcionadosState(this.recepcionadosState());
  }

  /**
   * Convierte un valor de MatSelect en un proveedor opcional.
   */
  private parseOptionalProviderId(value: unknown): number | null {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
  }
}
