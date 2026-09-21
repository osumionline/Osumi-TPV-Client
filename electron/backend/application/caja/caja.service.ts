import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface UtcPeriod {
  readonly desde: string;
  readonly hastaExclusive: string;
}

/**
 * Ejecuta las operaciones de negocio relacionadas con la caja.
 */
export default class CajaService {
  constructor(private readonly cajaRepository: CajaRepository) {}

  /**
   * Abre la caja del terminal indicado o devuelve la que ya estuviese abierta.
   */
  async open(command: AbrirCajaCommand): Promise<CajaAbiertaInterface> {
    if (command.terminalPublicId.trim().length === 0) {
      throw new Error('El terminal indicado no es válido.');
    }

    const caja: CajaAbiertaRecord = await this.cajaRepository.open({
      terminalPublicId: command.terminalPublicId.trim(),
    });

    return {
      id: caja.id,
      publicId: caja.publicId,
      idTerminal: caja.idTerminal,
      apertura: caja.apertura,
      importeAperturaCents: caja.importeAperturaCents,
    };
  }

  /**
   * Recupera las salidas correspondientes a un periodo civil local.
   */
  async findSalidas(consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de salidas de caja no es válida.');
    }

    const desde: LocalDateParts = this.requireLocalDate(
      consulta.desde,
      'La fecha inicial de las salidas de caja no es válida.',
    );

    const hasta: LocalDateParts = this.requireLocalDate(
      consulta.hasta,
      'La fecha final de las salidas de caja no es válida.',
    );

    const desdeKey: number = desde.year * 10_000 + desde.month * 100 + desde.day;
    const hastaKey: number = hasta.year * 10_000 + hasta.month * 100 + hasta.day;

    if (desdeKey > hastaKey) {
      throw new Error(
        'La fecha inicial de las salidas de caja no puede ser posterior a la fecha final.',
      );
    }

    const period: UtcPeriod = this.toUtcPeriod(desde, hasta);

    const records: readonly SalidaCajaRecord[] = await this.cajaRepository.findSalidasByPeriod(
      period.desde,
      period.hastaExclusive,
    );

    return records.map((record: SalidaCajaRecord): SalidaCajaInterface => ({
      publicId: record.publicId,
      concepto: record.concepto,
      descripcion: record.descripcion,
      importeCents: record.importeCents,
      fecha: record.fecha,
      editable: record.editable,
    }));
  }

  /**
   * Valida una fecha civil estricta en formato YYYY-MM-DD.
   */
  private requireLocalDate(value: string, message: string): LocalDateParts {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(message);
    }

    const parts: LocalDateParts = {
      year: Number(value.slice(0, 4)),
      month: Number(value.slice(5, 7)),
      day: Number(value.slice(8, 10)),
    };

    const date: Date = this.createLocalMidnight(parts);

    if (
      date.getFullYear() !== parts.year ||
      date.getMonth() !== parts.month - 1 ||
      date.getDate() !== parts.day
    ) {
      throw new Error(message);
    }

    return parts;
  }

  /**
   * Convierte un periodo civil inclusivo en el intervalo UTC [desde, hasta).
   */
  private toUtcPeriod(desde: LocalDateParts, hasta: LocalDateParts): UtcPeriod {
    const desdeDate: Date = this.createLocalMidnight(desde);
    const hastaExclusiveDate: Date = this.createLocalMidnight(hasta);

    hastaExclusiveDate.setDate(hastaExclusiveDate.getDate() + 1);

    return {
      desde: desdeDate.toISOString(),
      hastaExclusive: hastaExclusiveDate.toISOString(),
    };
  }

  /**
   * Construye la medianoche de una fecha civil usando
   * la zona horaria local del terminal.
   */
  private createLocalMidnight(parts: LocalDateParts): Date {
    const date: Date = new Date();

    date.setFullYear(parts.year, parts.month - 1, parts.day);
    date.setHours(0, 0, 0, 0);

    return date;
  }
}
