import type {
  InformeIntervaloUtc,
  InformePeriodosResueltos,
} from '@backend/domain/caja/informes/informe-periodo-resuelto.interface';
import type {
  InformeMes,
  InformePeriodoConsulta,
} from '@desktop-contracts/caja/informes/informe-periodo.interface';

interface InformePeriodoSelection {
  readonly year: number;
  readonly month: InformeMes;
}

/**
 * Resuelve los periodos temporales utilizados
 * por los informes de Caja.
 */
export default class InformePeriodoResolver {
  /**
   * Convierte una selección mensual o anual en su
   * intervalo UTC y en el periodo comparable anterior.
   */
  resolve(consulta: InformePeriodoConsulta): InformePeriodosResueltos {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('El periodo del informe no es válido.');
    }

    const year: number = this.requireYear(consulta.year);
    const month: InformeMes = this.requireMonth(consulta.month);

    const currentSelection: InformePeriodoSelection = {
      year,
      month,
    };

    const previousSelection: InformePeriodoSelection =
      this.resolvePreviousSelection(currentSelection);

    return {
      actual: this.createInterval(currentSelection),
      anterior: this.createInterval(previousSelection),
    };
  }

  /**
   * Obtiene el periodo inmediatamente anterior
   * que debe utilizarse para las comparativas.
   */
  private resolvePreviousSelection(selection: InformePeriodoSelection): InformePeriodoSelection {
    if (selection.month === 'todos') {
      return {
        year: selection.year - 1,
        month: 'todos',
      };
    }

    if (selection.month === 1) {
      return {
        year: selection.year - 1,
        month: 12,
      };
    }

    return {
      year: selection.year,
      month: (selection.month - 1) as InformeMes,
    };
  }

  /**
   * Valida el año recibido para un informe.
   *
   * Se reserva el año anterior porque todos los informes
   * comparativos necesitan poder resolverlo.
   */
  private requireYear(value: number): number {
    if (!Number.isSafeInteger(value) || value < 2 || value > 9998) {
      throw new Error('El año del informe no es válido.');
    }

    return value;
  }

  /**
   * Valida el mes recibido para un informe.
   */
  private requireMonth(value: InformeMes): InformeMes {
    if (value === 'todos') {
      return value;
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 12) {
      throw new Error('El mes del informe no es válido.');
    }

    return value as InformeMes;
  }

  /**
   * Construye el intervalo UTC correspondiente
   * a una selección mensual o anual.
   */
  private createInterval(selection: InformePeriodoSelection): InformeIntervaloUtc {
    const desdeDate: Date =
      selection.month === 'todos'
        ? this.createLocalMidnight(selection.year, 1, 1)
        : this.createLocalMidnight(selection.year, selection.month, 1);

    let hastaExclusiveDate: Date;

    if (selection.month === 'todos') {
      hastaExclusiveDate = this.createLocalMidnight(selection.year + 1, 1, 1);
    } else if (selection.month === 12) {
      hastaExclusiveDate = this.createLocalMidnight(selection.year + 1, 1, 1);
    } else {
      hastaExclusiveDate = this.createLocalMidnight(selection.year, selection.month + 1, 1);
    }

    return {
      year: selection.year,
      month: selection.month,
      desde: desdeDate.toISOString(),
      hastaExclusive: hastaExclusiveDate.toISOString(),
    };
  }

  /**
   * Construye la medianoche de una fecha civil
   * utilizando la zona horaria local del terminal.
   */
  private createLocalMidnight(year: number, month: number, day: number): Date {
    const date: Date = new Date();

    date.setFullYear(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    return date;
  }
}
