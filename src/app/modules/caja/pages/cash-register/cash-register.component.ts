import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import HeaderComponent from '@app/components/header/header.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';
import { getErrorMessage } from '@utils/error.utils';
import HistoricalSalesComponent from '@modules/ventas/components/historical-sales/historical-sales.component';

type CashRegisterSection = 'history' | 'outflows' | 'closing' | 'reports';

interface CashRegisterSectionDefinition {
  readonly id: CashRegisterSection;
  readonly label: string;
}

const CASH_REGISTER_SECTIONS: readonly CashRegisterSectionDefinition[] = [
  {
    id: 'history',
    label: 'Histórico de ventas',
  },
  {
    id: 'outflows',
    label: 'Salidas caja',
  },
  {
    id: 'closing',
    label: 'Cerrar caja',
  },
  {
    id: 'reports',
    label: 'Informes',
  },
];

/**
 * Página principal del módulo de Caja.
 */
@Component({
  selector: 'otpv-cash-register',
  templateUrl: './cash-register.component.html',
  styleUrl: './cash-register.component.scss',
  imports: [HeaderComponent, HistoricalSalesComponent],
})
export default class CashRegisterComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);

  readonly appDataService: AppDataService = inject(AppDataService);

  readonly sections: readonly CashRegisterSectionDefinition[] = CASH_REGISTER_SECTIONS;

  readonly activeSection: WritableSignal<CashRegisterSection> =
    signal<CashRegisterSection>('history');

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Precarga la configuración general utilizada por la cabecera.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Cambia la sección activa de Caja.
   */
  selectSection(section: CashRegisterSection): void {
    this.activeSection.set(section);
  }

  /**
   * Carga la configuración global de la instalación.
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
