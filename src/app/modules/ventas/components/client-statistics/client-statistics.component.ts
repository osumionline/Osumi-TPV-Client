import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type ClienteEstadisticasState from '@model/clientes/cliente-estadisticas-state.interface';
import type Cliente from '@model/clientes/cliente.model';
import IsoDateToSpanishPipe from '@pipes/iso-date-to-spanish.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ClientesService from '@services/clientes.service';

@Component({
  selector: 'otpv-client-statistics',
  templateUrl: './client-statistics.component.html',
  styleUrl: './client-statistics.component.scss',
  imports: [CurrencyPipe, IsoDateToSpanishPipe, MicrosToEurosPipe, MatButton, MatIcon],
})
export default class ClientStatisticsComponent {
  private readonly clientesService: ClientesService = inject(ClientesService);

  readonly cliente: InputSignal<Cliente> = input.required<Cliente>();

  readonly expanded: InputSignal<boolean> = input<boolean>(true);

  readonly toggleEvent: OutputEmitterRef<void> = output<void>();

  readonly estadisticasState: Signal<ClienteEstadisticasState> = computed(
    (): ClienteEstadisticasState =>
      this.clientesService.getEstadisticasState(this.cliente().publicId),
  );

  /**
   * Carga las estadísticas al recibir un cliente.
   *
   * untracked evita convertir accidentalmente el Map interno
   * de la caché en dependencia de este effect. Solo queremos
   * reaccionar a cambios del cliente.
   */
  private readonly loadEstadisticasRef = effect((): void => {
    const publicId: string | null = this.cliente().publicId;

    if (publicId === null) {
      return;
    }

    untracked((): void => {
      void this.clientesService.loadEstadisticas(publicId);
    });
  });

  /**
   * Fuerza una nueva consulta después de un error.
   */
  retry(): void {
    const publicId: string | null = this.cliente().publicId;

    if (publicId === null) {
      return;
    }

    void this.clientesService.reloadEstadisticas(publicId);
  }
}
