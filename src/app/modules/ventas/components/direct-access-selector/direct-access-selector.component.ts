import {
  Component,
  inject,
  OnInit,
  output,
  signal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type AccesoDirectoVenta from '@model/ventas/acceso-directo-venta.model';
import VentasArticulosService from '@services/ventas-articulos.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra los accesos directos configurados para seleccionar rápidamente un artículo.
 */
@Component({
  selector: 'otpv-direct-access-selector',
  templateUrl: './direct-access-selector.component.html',
  styleUrl: './direct-access-selector.component.scss',
  imports: [MatButton, MatIcon],
})
export default class DirectAccessSelectorComponent implements OnInit {
  private readonly ventasArticulosService: VentasArticulosService = inject(VentasArticulosService);

  readonly selectEvent: OutputEmitterRef<AccesoDirectoVenta> = output<AccesoDirectoVenta>();

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly accesos: WritableSignal<readonly AccesoDirectoVenta[]> = signal<
    readonly AccesoDirectoVenta[]
  >([]);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Carga los accesos directos al abrir el selector.
   */
  ngOnInit(): void {
    void this.load();
  }

  /**
   * Selecciona un acceso directo.
   */
  select(acceso: AccesoDirectoVenta): void {
    this.selectEvent.emit(acceso);
  }

  /**
   * Cierra el selector sin realizar ninguna selección.
   */
  close(): void {
    this.closeEvent.emit();
  }

  /**
   * Obtiene la lista actual de accesos directos.
   */
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.accesos.set(await this.ventasArticulosService.getAccesosDirectos());
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
