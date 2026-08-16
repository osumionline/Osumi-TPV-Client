import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type { ReservaLineaInterface } from '@desktop-contracts/reservas/reserva.interface';
import { DialogService } from '@osumi/angular-tools';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import IsoDateToSpanishPipe from '@pipes/iso-date-to-spanish.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ReservasService from '@services/reservas.service';
import { getErrorMessage } from '@utils/error.utils';

@Component({
  selector: 'otpv-reservation-manager',
  templateUrl: './reservation-manager.component.html',
  styleUrl: './reservation-manager.component.scss',
  imports: [
    CurrencyPipe,
    BpsToPercentPipe,
    IsoDateToSpanishPipe,
    MicrosToEurosPipe,
    MatButton,
    MatCheckbox,
    MatIcon,
    MatIconButton,
    MatProgressSpinner,
    MatTooltip,
  ],
})
export default class ReservationManagerComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);

  readonly reservasService: ReservasService = inject(ReservasService);

  readonly loadedPublicIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  readonly loadEvent: OutputEmitterRef<readonly ReservaInterface[]> =
    output<readonly ReservaInterface[]>();

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly selectedReservaPublicId: WritableSignal<string | null> = signal<string | null>(null);

  readonly selectedPublicIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);

  readonly mutating: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectedReserva: Signal<ReservaInterface | null> = computed(
    (): ReservaInterface | null => {
      const publicId: string | null = this.selectedReservaPublicId();

      if (publicId === null) {
        return null;
      }

      return (
        this.reservasService
          .reservas()
          .find((reserva: ReservaInterface): boolean => reserva.publicId === publicId) ?? null
      );
    },
  );

  readonly selectedCount: Signal<number> = computed((): number => this.selectedPublicIds().size);

  ngOnInit(): void {
    void this.reservasService.reload();
  }

  /**
   * Muestra el detalle de una reserva.
   */
  selectReserva(reserva: ReservaInterface): void {
    this.selectedReservaPublicId.set(reserva.publicId);

    this.operationError.set(null);
  }

  /**
   * Indica si la reserva ya pertenece
   * a otra venta abierta.
   */
  isLoaded(reserva: ReservaInterface): boolean {
    return this.loadedPublicIds().has(reserva.publicId);
  }

  /**
   * Indica si una reserva está marcada
   * para cargarla.
   */
  isSelected(reserva: ReservaInterface): boolean {
    return this.selectedPublicIds().has(reserva.publicId);
  }

  /**
   * Añade o retira una reserva de la
   * selección múltiple.
   */
  toggleReserva(reserva: ReservaInterface, checked: boolean): void {
    if (this.isLoaded(reserva)) {
      return;
    }

    const selected: Set<string> = new Set<string>(this.selectedPublicIds());

    if (!checked) {
      selected.delete(reserva.publicId);

      this.selectedPublicIds.set(selected);

      this.operationError.set(null);

      return;
    }

    const primeraSeleccionada: ReservaInterface | undefined = this.reservasService
      .reservas()
      .find((current: ReservaInterface): boolean => selected.has(current.publicId));

    if (
      primeraSeleccionada !== undefined &&
      primeraSeleccionada.clientePublicId !== reserva.clientePublicId
    ) {
      this.operationError.set('Las reservas seleccionadas deben pertenecer al mismo cliente.');

      return;
    }

    selected.add(reserva.publicId);

    this.selectedPublicIds.set(selected);

    this.operationError.set(null);
  }

  /**
   * Carga una sola reserva.
   */
  loadReserva(reserva: ReservaInterface): void {
    if (this.isLoaded(reserva)) {
      this.operationError.set('Esta reserva ya está cargada en una venta abierta.');

      return;
    }

    this.loadEvent.emit([reserva]);
  }

  /**
   * Carga todas las reservas marcadas.
   */
  loadSelected(): void {
    const selected: ReadonlySet<string> = this.selectedPublicIds();

    const reservas: readonly ReservaInterface[] = this.reservasService
      .reservas()
      .filter((reserva: ReservaInterface): boolean => selected.has(reserva.publicId));

    if (reservas.length === 0) {
      this.operationError.set('Debes seleccionar al menos una reserva.');

      return;
    }

    if (reservas.some((reserva: ReservaInterface): boolean => this.isLoaded(reserva))) {
      this.operationError.set(
        'Una de las reservas seleccionadas ya está cargada en una venta abierta.',
      );

      return;
    }

    const clientePublicId: string = reservas[0]!.clientePublicId;

    if (
      reservas.some(
        (reserva: ReservaInterface): boolean => reserva.clientePublicId !== clientePublicId,
      )
    ) {
      this.operationError.set('Las reservas seleccionadas deben pertenecer al mismo cliente.');

      return;
    }

    this.loadEvent.emit(reservas);
  }

  /**
   * Solicita eliminar una línea de reserva.
   */
  deleteLinea(linea: ReservaLineaInterface): void {
    const reserva: ReservaInterface | null = this.selectedReserva();

    if (reserva === null) {
      return;
    }

    if (this.isLoaded(reserva)) {
      this.operationError.set(
        'No se puede modificar una reserva mientras esté cargada en una venta abierta.',
      );

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content: `¿Estás seguro de querer eliminar la línea "${linea.nombre}" de la reserva? Las unidades volverán al stock.`,
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.confirmDeleteLinea(linea);
      });
  }

  /**
   * Solicita cancelar una reserva completa.
   */
  deleteReserva(reserva: ReservaInterface): void {
    if (this.isLoaded(reserva)) {
      this.operationError.set(
        'No se puede eliminar una reserva mientras esté cargada en una venta abierta.',
      );

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          '¿Estás seguro de querer eliminar esta reserva? Todas sus unidades volverán al stock.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.confirmDeleteReserva(reserva);
      });
  }

  close(): void {
    this.closeEvent.emit();
  }

  private async confirmDeleteLinea(linea: ReservaLineaInterface): Promise<void> {
    this.mutating.set(true);
    this.operationError.set(null);

    try {
      await this.reservasService.deleteLinea(linea.publicId);

      this.cleanupAfterReload();
    } catch (error: unknown) {
      this.operationError.set(
        getErrorMessage(error, 'No se ha podido eliminar la línea de reserva.'),
      );
    } finally {
      this.mutating.set(false);
    }
  }

  private async confirmDeleteReserva(reserva: ReservaInterface): Promise<void> {
    this.mutating.set(true);
    this.operationError.set(null);

    try {
      await this.reservasService.deleteReserva(reserva.publicId);

      this.cleanupAfterReload();
    } catch (error: unknown) {
      this.operationError.set(getErrorMessage(error, 'No se ha podido eliminar la reserva.'));
    } finally {
      this.mutating.set(false);
    }
  }

  /**
   * Elimina del estado local cualquier referencia
   * a reservas que hayan desaparecido tras una recarga.
   */
  private cleanupAfterReload(): void {
    const disponibles: Set<string> = new Set<string>(
      this.reservasService.reservas().map((reserva: ReservaInterface): string => reserva.publicId),
    );

    const selected: Set<string> = new Set<string>(
      [...this.selectedPublicIds()].filter((publicId: string): boolean =>
        disponibles.has(publicId),
      ),
    );

    this.selectedPublicIds.set(selected);

    const selectedReservaPublicId: string | null = this.selectedReservaPublicId();

    if (selectedReservaPublicId !== null && !disponibles.has(selectedReservaPublicId)) {
      this.selectedReservaPublicId.set(null);
    }
  }
}
