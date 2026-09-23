import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MONTH_OPTIONS, type MonthOption } from '@constants/date.constants';
import type { InformeMes } from '@desktop-contracts/caja/informes/informe-periodo.interface';
import type InformeTipo from '@desktop-contracts/caja/informes/informe-tipo.type';
import type Categoria from '@model/categorias/categoria.model';
import CategoriasService from '@services/articulos/categorias.service';
import CajaInformesService from '@services/caja/caja-informes.service';
import { getErrorMessage } from '@utils/error.utils';

interface InformeTipoOption {
  readonly value: InformeTipo;
  readonly label: string;
}

interface InformeMesOption {
  readonly value: InformeMes;
  readonly label: string;
}

const REPORT_TYPES: readonly InformeTipoOption[] = [
  {
    value: 'simple',
    label: 'Simple',
  },
  {
    value: 'detallado',
    label: 'Detallado',
  },
  {
    value: 'ventas',
    label: 'Ventas',
  },
];

/**
 * Gestiona los filtros y la apertura
 * de los informes disponibles en Caja.
 */
@Component({
  selector: 'otpv-cash-reports',
  templateUrl: './cash-reports.component.html',
  styleUrl: './cash-reports.component.scss',
  imports: [MatButton, MatFormFieldModule, MatSelectModule],
})
export default class CashReportsComponent implements OnInit {
  private readonly informesService: CajaInformesService = inject(CajaInformesService);
  readonly categoriasService: CategoriasService = inject(CategoriasService);

  readonly tipos: readonly InformeTipoOption[] = REPORT_TYPES;
  readonly meses: readonly InformeMesOption[] = [
    {
      value: 'todos',
      label: 'Todos',
    },
    ...MONTH_OPTIONS.map((month: MonthOption): InformeMesOption => ({
      value: month.value as InformeMes,

      label: month.label,
    })),
  ];

  readonly selectedType: WritableSignal<InformeTipo> = signal<InformeTipo>('simple');
  readonly selectedMonth: WritableSignal<InformeMes> = signal<InformeMes>(
    (new Date().getMonth() + 1) as InformeMes,
  );
  readonly selectedYear: WritableSignal<number> = signal<number>(new Date().getFullYear());
  readonly selectedCategoryId: WritableSignal<number | null> = signal<number | null>(null);
  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly years: readonly number[] = this.createYears();

  readonly showCategory: Signal<boolean> = computed(
    (): boolean => this.selectedType() === 'ventas',
  );
  readonly canGenerate: Signal<boolean> = computed((): boolean => {
    if (this.loading()) {
      return false;
    }

    if (this.selectedType() !== 'ventas') {
      return true;
    }

    return this.selectedCategoryId() !== null;
  });

  /**
   * Precarga el árbol de categorías utilizado
   * por el Informe de Ventas.
   */
  ngOnInit(): void {
    void this.loadCategorias();
  }

  /**
   * Cambia el tipo de informe seleccionado.
   */
  setType(type: InformeTipo): void {
    this.selectedType.set(type);
    this.error.set(null);
  }

  /**
   * Cambia el mes seleccionado.
   */
  setMonth(month: InformeMes): void {
    this.selectedMonth.set(month);
    this.error.set(null);
  }

  /**
   * Cambia el año seleccionado.
   */
  setYear(year: number): void {
    this.selectedYear.set(year);
    this.error.set(null);
  }

  /**
   * Cambia la categoría seleccionada
   * para el Informe de Ventas.
   */
  setCategoryId(idCategoria: number | null): void {
    this.selectedCategoryId.set(idCategoria);

    this.error.set(null);
  }

  /**
   * Genera el informe seleccionado
   * y abre su ventana independiente.
   */
  async generate(): Promise<void> {
    if (!this.canGenerate()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const consulta = {
        year: this.selectedYear(),
        month: this.selectedMonth(),
      };

      switch (this.selectedType()) {
        case 'simple':
          await this.informesService.openSimple(consulta);
          break;

        case 'detallado':
          await this.informesService.openDetallado(consulta);
          break;

        case 'ventas': {
          const idCategoria: number | null = this.selectedCategoryId();

          if (idCategoria === null) {
            return;
          }

          await this.informesService.openVentas({
            ...consulta,
            idCategoria,
          });

          break;
        }
      }
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido abrir el informe.'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Devuelve una etiqueta indentada
   * para una categoría del árbol.
   */
  getCategoryLabel(categoria: Categoria): string {
    const prefix: string =
      categoria.profundidad <= 1 ? '' : `${'— '.repeat(categoria.profundidad - 1)}`;

    return `${prefix}${categoria.nombre}`;
  }

  /**
   * Construye los cinco años disponibles:
   * el actual y los cuatro anteriores.
   */
  private createYears(): readonly number[] {
    const currentYear: number = new Date().getFullYear();

    return Array.from(
      {
        length: 5,
      },

      (_: unknown, index: number): number => currentYear - index,
    );
  }

  /**
   * Precarga las categorías y selecciona
   * la primera disponible como valor inicial.
   */
  private async loadCategorias(): Promise<void> {
    try {
      await this.categoriasService.load();

      if (this.selectedCategoryId() !== null) {
        return;
      }

      const firstCategory: Categoria | undefined = this.categoriasService.categoriasPlain()[0];

      if (firstCategory?.id !== null && firstCategory?.id !== undefined) {
        this.selectedCategoryId.set(firstCategory.id);
      }
    } catch (error: unknown) {
      console.error('Error cargando las categorías para Informes:', error);
    }
  }
}
