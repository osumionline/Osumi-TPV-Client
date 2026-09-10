import { Component, computed, inject, type OnInit, type Signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import HeaderComponent from '@app/components/header/header.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Carcasa inicial de la ficha de Pedido.
 * Su contenido funcional se implementará en 16.4.
 */
@Component({
  selector: 'otpv-purchase-order',
  templateUrl: './purchase-order.component.html',
  styleUrl: './purchase-order.component.scss',
  imports: [HeaderComponent, MatIcon, MatIconButton, RouterLink],
})
export default class PurchaseOrderComponent implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();
    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  readonly title: string = this.createTitle();

  /**
   * Carga la configuración general utilizada por la página.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Construye el título a partir de la ruta actual.
   */
  private createTitle(): string {
    const idPedido: string | null = this.route.snapshot.paramMap.get('idPedido');

    return idPedido === null ? 'Nuevo pedido' : `Pedido ${idPedido}`;
  }

  /**
   * Precarga AppData para el header.
   */
  private async loadAppData(): Promise<void> {
    try {
      await this.appDataService.load();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            error,
            'No se ha podido cargar la configuración de la aplicación.',
          ),
        })
        .subscribe();
    }
  }
}
