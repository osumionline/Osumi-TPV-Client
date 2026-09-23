import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import type InformeSimpleProvider from '@backend/contracts/caja/informes/informe-simple-provider.interface';
import type InformeSimpleRepository from '@backend/contracts/caja/informes/informe-simple.repository.interface';
import type { InformePeriodosResueltos } from '@backend/domain/caja/informes/informe-periodo-resuelto.interface';
import type {
  InformeSimpleRepositoryResult,
  InformeSimpleTipoPagoRecord,
  InformeSimpleVentaRecord,
} from '@backend/domain/caja/informes/informe-simple-record.interface';
import type { InformeMes } from '@desktop-contracts/caja/informes/informe-periodo.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleGranularidad,
  InformeSimpleImporteTipoPago,
  InformeSimpleItem,
  InformeSimpleResultado,
  InformeSimpleTicket,
  InformeSimpleTipoPago,
  InformeSimpleTotales,
} from '@desktop-contracts/caja/informes/informe-simple.interface';

interface MutableInformeSimpleBucket {
  readonly year: number;
  readonly month: number;
  readonly day: number | null;
  numeroVentas: number;
  primerTicket: InformeSimpleTicket | null;
  ultimoTicket: InformeSimpleTicket | null;
  readonly importesTipoPago: Map<string, number>;
  totalCents: number;
}

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * Construye el Informe Simple de Caja a partir
 * de ventas y pagos históricos persistidos.
 */
export default class InformeSimpleService implements InformeSimpleProvider {
  constructor(
    private readonly repository: InformeSimpleRepository,
    private readonly periodoResolver: InformePeriodoResolver,
  ) {}

  /**
   * Obtiene el Informe Simple correspondiente
   * al mes o año completo solicitado.
   */
  async getInforme(consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado> {
    const periodos: InformePeriodosResueltos = this.periodoResolver.resolve(consulta);

    const record: InformeSimpleRepositoryResult = await this.repository.findByPeriod(
      periodos.actual.desde,
      periodos.actual.hastaExclusive,
    );

    const granularidad: InformeSimpleGranularidad = consulta.month === 'todos' ? 'mes' : 'dia';

    const buckets: MutableInformeSimpleBucket[] = this.createBuckets(consulta.year, consulta.month);

    const bucketsByKey: Map<string, MutableInformeSimpleBucket> = new Map<
      string,
      MutableInformeSimpleBucket
    >(
      buckets.map((bucket: MutableInformeSimpleBucket): [string, MutableInformeSimpleBucket] => [
        this.getBucketKey(bucket.month, bucket.day, granularidad),
        bucket,
      ]),
    );

    const bucketsByVentaId: Map<number, MutableInformeSimpleBucket> = new Map<
      number,
      MutableInformeSimpleBucket
    >();

    let primerTicket: InformeSimpleTicket | null = null;
    let ultimoTicket: InformeSimpleTicket | null = null;
    let numeroVentas: number = 0;
    let totalCents: number = 0;

    for (const venta of record.ventas) {
      const dateParts: LocalDateParts = this.getLocalDateParts(venta.fecha);

      const bucketKey: string = this.getBucketKey(
        dateParts.month,
        granularidad === 'dia' ? dateParts.day : null,
        granularidad,
      );

      const bucket: MutableInformeSimpleBucket | undefined = bucketsByKey.get(bucketKey);

      if (bucket === undefined || dateParts.year !== consulta.year) {
        throw new Error('Una venta del Informe Simple queda fuera del periodo solicitado.');
      }

      const ticket: InformeSimpleTicket = this.toTicket(venta);

      bucket.numeroVentas = this.safeAdd(
        bucket.numeroVentas,
        1,
        'El número de ventas del Informe Simple supera el rango numérico seguro.',
      );

      bucket.primerTicket ??= ticket;
      bucket.ultimoTicket = ticket;

      bucket.totalCents = this.safeAdd(
        bucket.totalCents,
        venta.totalCents,
        'El total de una fila del Informe Simple supera el rango numérico seguro.',
      );

      bucketsByVentaId.set(venta.id, bucket);

      numeroVentas = this.safeAdd(
        numeroVentas,
        1,
        'El número total de ventas del Informe Simple supera el rango numérico seguro.',
      );

      totalCents = this.safeAdd(
        totalCents,
        venta.totalCents,
        'El total del Informe Simple supera el rango numérico seguro.',
      );

      primerTicket ??= ticket;
      ultimoTicket = ticket;
    }

    const tipoPagoIds: Set<string> = new Set<string>(
      record.tiposPago.map((tipoPago: InformeSimpleTipoPagoRecord): string => tipoPago.publicId),
    );

    for (const pago of record.pagos) {
      if (!tipoPagoIds.has(pago.tipoPagoPublicId)) {
        throw new Error('Un pago del Informe Simple utiliza un tipo de pago desconocido.');
      }

      const bucket: MutableInformeSimpleBucket | undefined = bucketsByVentaId.get(pago.idVenta);

      if (bucket === undefined) {
        throw new Error('Un pago del Informe Simple no pertenece a ninguna venta del periodo.');
      }

      const currentValue: number = bucket.importesTipoPago.get(pago.tipoPagoPublicId) ?? 0;

      bucket.importesTipoPago.set(
        pago.tipoPagoPublicId,
        this.safeAdd(
          currentValue,
          pago.importeCents,
          'El importe de un tipo de pago del Informe Simple supera el rango numérico seguro.',
        ),
      );
    }

    const tiposPago: readonly InformeSimpleTipoPago[] = record.tiposPago.map(
      (tipoPago: InformeSimpleTipoPagoRecord): InformeSimpleTipoPago => ({
        publicId: tipoPago.publicId,
        nombre: tipoPago.nombre,
        slug: tipoPago.slug,
        orden: tipoPago.orden,
      }),
    );

    const totalImportesTipoPago: Map<string, number> = new Map<string, number>();

    let sumaCents: number = 0;

    const items: readonly InformeSimpleItem[] = buckets.map(
      (bucket: MutableInformeSimpleBucket): InformeSimpleItem => {
        sumaCents = this.safeAdd(
          sumaCents,
          bucket.totalCents,
          'El acumulado del Informe Simple supera el rango numérico seguro.',
        );

        const importesTipoPago: readonly InformeSimpleImporteTipoPago[] = tiposPago.map(
          (tipoPago: InformeSimpleTipoPago): InformeSimpleImporteTipoPago => {
            const importeCents: number = bucket.importesTipoPago.get(tipoPago.publicId) ?? 0;

            const totalActual: number = totalImportesTipoPago.get(tipoPago.publicId) ?? 0;

            totalImportesTipoPago.set(
              tipoPago.publicId,
              this.safeAdd(
                totalActual,
                importeCents,
                'El total de un tipo de pago del Informe Simple supera el rango numérico seguro.',
              ),
            );

            return {
              tipoPagoPublicId: tipoPago.publicId,
              importeCents,
            };
          },
        );

        return {
          year: bucket.year,
          month: bucket.month,
          day: bucket.day,
          numeroVentas: bucket.numeroVentas,
          primerTicket: bucket.primerTicket,
          ultimoTicket: bucket.ultimoTicket,
          importesTipoPago,
          totalCents: bucket.totalCents,
          sumaCents,
        };
      },
    );

    const totales: InformeSimpleTotales = {
      numeroVentas,
      primerTicket,
      ultimoTicket,
      importesTipoPago: tiposPago.map(
        (tipoPago: InformeSimpleTipoPago): InformeSimpleImporteTipoPago => ({
          tipoPagoPublicId: tipoPago.publicId,
          importeCents: totalImportesTipoPago.get(tipoPago.publicId) ?? 0,
        }),
      ),
      totalCents,
      sumaCents,
    };

    return {
      granularidad,
      tiposPago,
      items,
      totales,
    };
  }

  /**
   * Crea todas las filas temporales que deben existir
   * aunque no haya ninguna venta en ellas.
   */
  private createBuckets(year: number, month: InformeMes): MutableInformeSimpleBucket[] {
    if (month === 'todos') {
      return Array.from(
        {
          length: 12,
        },
        (_: unknown, index: number): MutableInformeSimpleBucket =>
          this.createBucket(year, index + 1, null),
      );
    }

    const numberOfDays: number = new Date(year, month, 0).getDate();

    return Array.from(
      {
        length: numberOfDays,
      },
      (_: unknown, index: number): MutableInformeSimpleBucket =>
        this.createBucket(year, month, index + 1),
    );
  }

  /**
   * Crea una fila interna inicialmente vacía.
   */
  private createBucket(
    year: number,
    month: number,
    day: number | null,
  ): MutableInformeSimpleBucket {
    return {
      year,
      month,
      day,
      numeroVentas: 0,
      primerTicket: null,
      ultimoTicket: null,
      importesTipoPago: new Map<string, number>(),
      totalCents: 0,
    };
  }

  /**
   * Construye la clave interna de una fila
   * diaria o mensual.
   */
  private getBucketKey(
    month: number,
    day: number | null,
    granularidad: InformeSimpleGranularidad,
  ): string {
    if (granularidad === 'mes') {
      return String(month);
    }

    if (day === null) {
      throw new Error('Una fila diaria del Informe Simple necesita un día.');
    }

    return `${month}-${day}`;
  }

  /**
   * Obtiene los componentes civiles locales
   * de una fecha persistida.
   */
  private getLocalDateParts(value: string): LocalDateParts {
    const date: Date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Una fecha de venta del Informe Simple no es válida.');
    }

    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  /**
   * Convierte una venta persistida en la referencia
   * de ticket utilizada por el informe.
   */
  private toTicket(venta: InformeSimpleVentaRecord): InformeSimpleTicket {
    return {
      serie: venta.serie,
      numero: venta.numero,
    };
  }

  /**
   * Suma dos enteros garantizando que el resultado
   * permanezca dentro del rango seguro de JavaScript.
   */
  private safeAdd(left: number, right: number, message: string): number {
    if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
      throw new RangeError(message);
    }

    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new RangeError(message);
    }

    return result;
  }
}
