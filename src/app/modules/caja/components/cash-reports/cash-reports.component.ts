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
import type { InformeMes } from '@desktop-contracts/caja/informes/informe-periodo.interface';
import type { InformeSimpleResultado } from '@desktop-contracts/caja/informes/informe-simple.interface';
import type InformeTipo from '@desktop-contracts/caja/informes/informe-tipo.type';
import type Categoria from '@model/categorias/categoria.model';
import SimpleReportComponent from '@modules/caja/components/simple-report/simple-report.component';
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

const REPORT_MONTHS: readonly InformeMesOption[] = [
  {
    value: 'todos',
    label: 'Todos',
  },
  {
    value: 1,
    label: 'Enero',
  },
  {
    value: 2,
    label: 'Febrero',
  },
  {
    value: 3,
    label: 'Marzo',
  },
  {
    value: 4,
    label: 'Abril',
  },
  {
    value: 5,
    label: 'Mayo',
  },
  {
    value: 6,
    label: 'Junio',
  },
  {
    value: 7,
    label: 'Julio',
  },
  {
    value: 8,
    label: 'Agosto',
  },
  {
    value: 9,
    label: 'Septiembre',
  },
  {
    value: 10,
    label: 'Octubre',
  },
  {
    value: 11,
    label: 'Noviembre',
  },
  {
    value: 12,
    label: 'Diciembre',
  },
];

/**
 * Gestiona los filtros y la generación
 * de los informes disponibles en Caja.
 */
@Component({
  selector: 'otpv-cash-reports',
  templateUrl: './cash-reports.component.html',
  styleUrl: './cash-reports.component.scss',
  imports: [MatButton, MatFormFieldModule, MatSelectModule, SimpleReportComponent],
})
export default class CashReportsComponent implements OnInit {
  private readonly informesService: CajaInformesService = inject(CajaInformesService);

  readonly categoriasService: CategoriasService = inject(CategoriasService);

  readonly tipos: readonly InformeTipoOption[] = REPORT_TYPES;
  readonly meses: readonly InformeMesOption[] = REPORT_MONTHS;

  readonly selectedType: WritableSignal<InformeTipo> = signal<InformeTipo>('simple');

  readonly selectedMonth: WritableSignal<InformeMes> = signal<InformeMes>(
    (new Date().getMonth() + 1) as InformeMes,
  );

  readonly selectedYear: WritableSignal<number> = signal<number>(new Date().getFullYear());

  readonly selectedCategoryId: WritableSignal<number | null> = signal<number | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly simpleResult: WritableSignal<InformeSimpleResultado | null> =
    signal<InformeSimpleResultado | null>(null);

  readonly years: readonly number[] = this.createYears();

  readonly showCategory: Signal<boolean> = computed(
    (): boolean => this.selectedType() === 'ventas',
  );

  readonly canGenerate: Signal<boolean> = computed(
    (): boolean => !this.loading() && this.selectedType() === 'simple',
  );

  /**
   * Precarga el árbol de categorías utilizado
   * por el futuro Informe de Ventas.
   */
  ngOnInit(): void {
    void this.loadCategorias();
  }

  /**
   * Cambia el tipo de informe seleccionado
   * y descarta cualquier resultado anterior.
   */
  setType(type: InformeTipo): void {
    this.selectedType.set(type);
    this.clearResult();
  }

  /**
   * Cambia el mes seleccionado
   * y descarta cualquier resultado anterior.
   */
  setMonth(month: InformeMes): void {
    this.selectedMonth.set(month);
    this.clearResult();
  }

  /**
   * Cambia el año seleccionado
   * y descarta cualquier resultado anterior.
   */
  setYear(year: number): void {
    this.selectedYear.set(year);
    this.clearResult();
  }

  /**
   * Cambia la categoría seleccionada
   * para el Informe de Ventas.
   */
  setCategoryId(idCategoria: number | null): void {
    this.selectedCategoryId.set(idCategoria);
    this.clearResult();
  }

  /**
   * Genera el informe correspondiente
   * a los filtros actualmente seleccionados.
   */
  async generate(): Promise<void> {
    if (!this.canGenerate()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.simpleResult.set(null);

    try {
      const result: InformeSimpleResultado = await this.informesService.getSimple({
        year: this.selectedYear(),
        month: this.selectedMonth(),
      });

      this.simpleResult.set(result);
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido generar el informe.'));
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

  /**
   * Descarta el resultado mostrado y cualquier
   * error perteneciente a filtros anteriores.
   */
  private clearResult(): void {
    this.simpleResult.set(null);
    this.error.set(null);
  }
}
