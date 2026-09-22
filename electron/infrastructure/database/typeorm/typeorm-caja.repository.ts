import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type {
  CajaCierreRecord,
  CajaCierreTipoPagoRecord,
} from '@backend/domain/caja/caja-cierre-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import CAJA_RECUENTO_DENOMINACIONES_CENTS from '@desktop-contracts/caja/caja-recuento.constants';
import type {
  CerrarCajaCommand,
  CerrarCajaRecuentoCommand,
} from '@desktop-contracts/caja/cerrar-caja-command.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

interface CajaCierreDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly apertura: string;
  readonly importe_apertura_cents: number;
  readonly ventas_afectan_caja_cents: number;
  readonly salidas_caja_cents: number;
}

interface CajaCierreTipoPagoDatabaseRow {
  readonly public_id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly afecta_caja: number;
  readonly orden: number;
  readonly operaciones: number;
  readonly importe_ventas_cents: number;
}

interface IdDatabaseRow {
  readonly id: number;
}

interface SalidaCajaEditableDatabaseRow {
  readonly id: number;
  readonly created_at: string;
}

interface SalidaCajaDatabaseRow {
  readonly public_id: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importe_cents: number;
  readonly fecha: string;
  readonly editable: number;
}

interface CajaAbiertaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_terminal: number;
  readonly apertura: string;
  readonly importe_apertura_cents: number;
}

interface CajaAnteriorDatabaseRow {
  readonly importe_cierre_real_cents: number;
  readonly movimientos_entrada_cents: number;
}

interface TerminalIdDatabaseRow {
  readonly id: number;
}

interface CajaVentaDatabaseRow {
  readonly id: number;
  readonly total_cents: number;
}

interface CajaVentaLineaDatabaseRow {
  readonly id_venta: number;
  readonly puc_micros: number;
  readonly pvp_micros: number;
  readonly importe_micros: number;
  readonly descuento_bps: number;
  readonly importe_descuento_micros: number;
  readonly unidades: number;
}

interface CajaVentaPagoDatabaseRow {
  readonly id_venta: number;
  readonly id_tipo_pago: number;
  readonly importe_cents: number;
}

interface CajaTipoIdentityDatabaseRow {
  readonly id_tipo_pago: number;
  readonly public_id: string;
  readonly slug: string;
}

interface CajaCanonicalTotals {
  readonly ventasCents: number;
  readonly beneficiosCents: number;
  readonly descuentosCents: number;
  readonly descuentosTipoCents: ReadonlyMap<number, number>;
}

/**
 * Gestiona la persistencia de las operaciones de caja sobre SQLite.
 */
export default class TypeOrmCajaRepository implements CajaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Obtiene la caja abierta del terminal o crea una nueva de forma transaccional.
   */
  async open(command: AbrirCajaCommand): Promise<CajaAbiertaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    try {
      return await runDataSourceTransaction(
        dataSource,
        async (queryRunner: QueryRunner): Promise<CajaAbiertaRecord> => {
          const terminalId: number = await this.getTerminalId(
            queryRunner,
            command.terminalPublicId,
          );

          const cajaAbierta: CajaAbiertaRecord | null = await this.getCajaAbierta(
            queryRunner,
            terminalId,
          );

          if (cajaAbierta !== null) {
            return cajaAbierta;
          }

          const importeAperturaCents: number = await this.getImporteAperturaCents(
            queryRunner,
            terminalId,
          );

          const apertura: string = new Date().toISOString();
          const publicId: string = randomUUID();

          await queryRunner.query(
            `
            INSERT INTO caja (
              public_id,
              id_terminal,
              id_empleado_apertura,
              id_empleado_cierre,
              apertura,
              cierre,
              ventas_cents,
              beneficios_cents,
              descuentos_cents,
              movimientos_entrada_cents,
              movimientos_salida_cents,
              importe_apertura_cents,
              importe_cierre_teorico_cents,
              importe_cierre_real_cents,
              importe_retirado_cents,
              observaciones,
              created_at,
              updated_at
            )
            VALUES (
              ?,
              ?,
              NULL,
              NULL,
              ?,
              NULL,
              0,
              0,
              0,
              0,
              0,
              ?,
              0,
              0,
              0,
              NULL,
              ?,
              ?
            )
          `,
            [publicId, terminalId, apertura, importeAperturaCents, apertura, apertura],
          );

          const id: number = await getLastInsertId(
            queryRunner,
            'No se ha podido obtener el identificador de la caja creada.',
          );

          await this.createPaymentTypeRows(queryRunner, id, apertura);

          return {
            id,
            publicId,
            idTerminal: terminalId,
            apertura,
            importeAperturaCents,
          };
        },
      );
    } catch (error: unknown) {
      throw new Error('No se ha podido abrir la caja.', {
        cause: error,
      });
    }
  }

  /**
   * Recupera las salidas activas correspondientes al intervalo indicado.
   */
  async findSalidasByPeriod(
    desde: string,
    hastaExclusive: string,
  ): Promise<readonly SalidaCajaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly SalidaCajaDatabaseRow[] = (await dataSource.query(
      `
      SELECT
        mc.public_id,
        mc.concepto,
        mc.descripcion,
        mc.importe_cents,
        mc.created_at AS fecha,
        CASE
          WHEN c.cierre IS NULL THEN 1
          ELSE 0
        END AS editable
      FROM movimiento_caja mc

      INNER JOIN caja c
        ON c.id = mc.id_caja

      WHERE
        mc.tipo = 'salida'
        AND mc.deleted_at IS NULL
        AND mc.created_at >= ?
        AND mc.created_at < ?

      ORDER BY
        mc.created_at DESC,
        mc.id DESC
    `,
      [desde, hastaExclusive],
    )) as readonly SalidaCajaDatabaseRow[];

    return rows.map((row: SalidaCajaDatabaseRow): SalidaCajaRecord => ({
      publicId: row.public_id,
      concepto: row.concepto,
      descripcion: row.descripcion,
      importeCents: row.importe_cents,
      fecha: row.fecha,
      editable: row.editable === 1,
    }));
  }

  /**
   * Obtiene el snapshot económico canónico de una caja abierta.
   */
  async findCierre(cajaPublicId: string): Promise<CajaCierreRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      (queryRunner: QueryRunner): Promise<CajaCierreRecord | null> =>
        this.findCierreWithQueryRunner(queryRunner, cajaPublicId),
    );
  }

  /**
   * Consolida y cierra una caja utilizando una única transacción.
   *
   * Los totales económicos se recalculan desde ventas, líneas,
   * pagos y movimientos reales. El renderer únicamente aporta
   * recuento, retirada, entrada e importes reales por tipo.
   */
  async close(command: CerrarCajaCommand): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const cierre: CajaCierreRecord | null = await this.findCierreWithQueryRunner(
        queryRunner,
        command.cajaPublicId,
      );

      if (cierre === null) {
        throw new Error('La caja indicada no está abierta.');
      }

      const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

      const canonicalTotals: CajaCanonicalTotals = await this.calculateCanonicalTotals(
        queryRunner,
        cajaId,
      );

      const importeRealCents: number = this.calculateRecuentoTotal(command.recuento);

      const saldoFinalTeoricoCents: number = this.safeSubtract(
        this.safeAdd(
          cierre.importeAperturaCents,
          cierre.ventasAfectanCajaCents,
          'El saldo final teórico de la caja supera el rango numérico seguro.',
        ),
        cierre.salidasCajaCents,
        'El saldo final teórico de la caja supera el rango numérico seguro.',
      );

      const now: string = new Date().toISOString();

      await this.ensureCajaTipoRowsForUsedPaymentTypes(queryRunner, cajaId, now);

      const tiposPagoRows: readonly CajaTipoIdentityDatabaseRow[] = (await queryRunner.query(
        `
            SELECT
              ct.id_tipo_pago,
              tp.public_id,
              tp.slug
            FROM caja_tipo ct

            INNER JOIN tipo_pago tp
              ON tp.id = ct.id_tipo_pago

            WHERE ct.id_caja = ?

            ORDER BY
              tp.orden,
              tp.nombre COLLATE NOCASE,
              tp.id
          `,
        [cajaId],
      )) as readonly CajaTipoIdentityDatabaseRow[];

      const realesPorTipo: Map<string, number> = new Map<string, number>();

      for (const tipoPago of command.tiposPago) {
        if (realesPorTipo.has(tipoPago.tipoPagoPublicId)) {
          throw new Error('El cierre contiene un tipo de pago duplicado.');
        }

        realesPorTipo.set(tipoPago.tipoPagoPublicId, tipoPago.importeRealCents);
      }

      const tiposPagoEditables: readonly CajaTipoIdentityDatabaseRow[] = tiposPagoRows.filter(
        (tipoPago: CajaTipoIdentityDatabaseRow): boolean => tipoPago.slug !== 'efectivo',
      );

      if (
        realesPorTipo.size !== tiposPagoEditables.length ||
        tiposPagoEditables.some(
          (tipoPago: CajaTipoIdentityDatabaseRow): boolean =>
            !realesPorTipo.has(tipoPago.public_id),
        )
      ) {
        throw new Error('Los tipos de pago del cierre ya no coinciden con la caja actual.');
      }

      const cierreTiposPagoByPublicId: ReadonlyMap<string, CajaCierreTipoPagoRecord> = new Map(
        cierre.tiposPago.map(
          (tipoPago: CajaCierreTipoPagoRecord): readonly [string, CajaCierreTipoPagoRecord] => [
            tipoPago.publicId,
            tipoPago,
          ],
        ),
      );

      for (const tipoPago of tiposPagoRows) {
        const cierreTipo: CajaCierreTipoPagoRecord | undefined = cierreTiposPagoByPublicId.get(
          tipoPago.public_id,
        );

        if (cierreTipo === undefined) {
          throw new Error('No se ha podido reconstruir uno de los tipos de pago de la caja.');
        }

        const importeRealTipoCents: number | null =
          tipoPago.slug === 'efectivo' ? null : (realesPorTipo.get(tipoPago.public_id) ?? null);

        if (tipoPago.slug !== 'efectivo' && importeRealTipoCents === null) {
          throw new Error('Falta el importe real de uno de los tipos de pago.');
        }

        await queryRunner.query(
          `
            UPDATE caja_tipo
            SET
              operaciones = ?,
              importe_total_cents = ?,
              importe_real_cents = ?,
              importe_descuento_cents = ?,
              updated_at = ?
            WHERE
              id_caja = ?
              AND id_tipo_pago = ?
          `,
          [
            cierreTipo.operaciones,
            cierreTipo.importeVentasCents,
            importeRealTipoCents,
            canonicalTotals.descuentosTipoCents.get(tipoPago.id_tipo_pago) ?? 0,
            now,
            cajaId,
            tipoPago.id_tipo_pago,
          ],
        );
      }

      await queryRunner.query(
        `
          DELETE FROM caja_recuento
          WHERE
            id_caja = ?
            AND momento = 'cierre'
        `,
        [cajaId],
      );

      for (const item of command.recuento) {
        await queryRunner.query(
          `
            INSERT INTO caja_recuento (
              id_caja,
              momento,
              valor_centimos,
              cantidad,
              created_at
            )
            VALUES (
              ?,
              'cierre',
              ?,
              ?,
              ?
            )
          `,
          [cajaId, item.valorCents, item.cantidad, now],
        );
      }

      await queryRunner.query(
        `
          UPDATE caja
          SET
            cierre = ?,
            ventas_cents = ?,
            beneficios_cents = ?,
            descuentos_cents = ?,
            movimientos_entrada_cents = ?,
            movimientos_salida_cents = ?,
            importe_cierre_teorico_cents = ?,
            importe_cierre_real_cents = ?,
            importe_retirado_cents = ?,
            updated_at = ?
          WHERE
            id = ?
            AND cierre IS NULL
        `,
        [
          now,
          canonicalTotals.ventasCents,
          canonicalTotals.beneficiosCents,
          canonicalTotals.descuentosCents,
          command.entradaCents,
          cierre.salidasCajaCents,
          saldoFinalTeoricoCents,
          importeRealCents,
          command.retiradoCents,
          now,
          cajaId,
        ],
      );
    });
  }

  /**
   * Crea una nueva salida sobre una caja todavía abierta.
   */
  async createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<SalidaCajaRecord> => {
        const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

        const publicId: string = randomUUID();
        const now: string = new Date().toISOString();

        await queryRunner.query(
          `
          INSERT INTO movimiento_caja (
            public_id,
            id_caja,
            id_empleado,
            tipo,
            concepto,
            importe_cents,
            descripcion,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            NULL,
            'salida',
            ?,
            ?,
            ?,
            ?,
            ?,
            NULL
          )
        `,
          [publicId, cajaId, command.concepto, command.importeCents, command.descripcion, now, now],
        );

        await this.refreshSalidaAggregate(queryRunner, cajaId, now);

        return {
          publicId,
          concepto: command.concepto,
          descripcion: command.descripcion,
          importeCents: command.importeCents,
          fecha: now,
          editable: true,
        };
      },
    );
  }

  /**
   * Actualiza una salida únicamente cuando continúa
   * perteneciendo a la caja abierta indicada.
   */
  async updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<SalidaCajaRecord> => {
        const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

        const current: SalidaCajaEditableDatabaseRow = await this.requireEditableSalida(
          queryRunner,
          command.publicId,
          cajaId,
        );

        const now: string = new Date().toISOString();

        await queryRunner.query(
          `
          UPDATE movimiento_caja
          SET
            concepto = ?,
            importe_cents = ?,
            descripcion = ?,
            updated_at = ?
          WHERE id = ?
        `,
          [command.concepto, command.importeCents, command.descripcion, now, current.id],
        );

        await this.refreshSalidaAggregate(queryRunner, cajaId, now);

        return {
          publicId: command.publicId,
          concepto: command.concepto,
          descripcion: command.descripcion,
          importeCents: command.importeCents,
          fecha: current.created_at,
          editable: true,
        };
      },
    );
  }

  /**
   * Da de baja lógicamente una salida de la caja abierta indicada.
   */
  async deleteSalida(command: EliminarSalidaCajaCommand): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const cajaId: number = await this.requireOpenCajaId(queryRunner, command.cajaPublicId);

      const current: SalidaCajaEditableDatabaseRow = await this.requireEditableSalida(
        queryRunner,
        command.publicId,
        cajaId,
      );

      const now: string = new Date().toISOString();

      await queryRunner.query(
        `
          UPDATE movimiento_caja
          SET
            deleted_at = ?,
            updated_at = ?
          WHERE id = ?
        `,
        [now, now, current.id],
      );

      await this.refreshSalidaAggregate(queryRunner, cajaId, now);
    });
  }

  /**
   * Recalcula los acumulados económicos de una caja
   * desde las ventas y líneas realmente persistidas.
   */
  private async calculateCanonicalTotals(
    queryRunner: QueryRunner,
    cajaId: number,
  ): Promise<CajaCanonicalTotals> {
    const ventas: readonly CajaVentaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          v.id,
          v.total_cents
        FROM venta v
        WHERE
          v.id_caja = ?
          AND v.deleted_at IS NULL
        ORDER BY v.id
      `,
      [cajaId],
    )) as readonly CajaVentaDatabaseRow[];

    const lineas: readonly CajaVentaLineaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          lv.id_venta,
          lv.puc_micros,
          lv.pvp_micros,
          lv.importe_micros,
          lv.descuento_bps,
          lv.importe_descuento_micros,
          lv.unidades
        FROM linea_venta lv

        INNER JOIN venta v
          ON v.id = lv.id_venta

        WHERE
          v.id_caja = ?
          AND v.deleted_at IS NULL

        ORDER BY
          lv.id_venta,
          lv.id
      `,
      [cajaId],
    )) as readonly CajaVentaLineaDatabaseRow[];

    const pagos: readonly CajaVentaPagoDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          vp.id_venta,
          vp.id_tipo_pago,
          vp.importe_cents
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        WHERE
          v.id_caja = ?
          AND v.deleted_at IS NULL

        ORDER BY
          vp.id_venta,
          vp.orden,
          vp.id
      `,
      [cajaId],
    )) as readonly CajaVentaPagoDatabaseRow[];

    const lineasPorVenta: Map<number, CajaVentaLineaDatabaseRow[]> = new Map<
      number,
      CajaVentaLineaDatabaseRow[]
    >();

    for (const linea of lineas) {
      const current: CajaVentaLineaDatabaseRow[] = lineasPorVenta.get(linea.id_venta) ?? [];

      current.push(linea);
      lineasPorVenta.set(linea.id_venta, current);
    }

    const pagosPorVenta: Map<number, CajaVentaPagoDatabaseRow[]> = new Map<
      number,
      CajaVentaPagoDatabaseRow[]
    >();

    for (const pago of pagos) {
      const current: CajaVentaPagoDatabaseRow[] = pagosPorVenta.get(pago.id_venta) ?? [];

      current.push(pago);
      pagosPorVenta.set(pago.id_venta, current);
    }

    let ventasCents: number = 0;
    let beneficiosCents: number = 0;
    let descuentosCents: number = 0;

    const descuentosTipoCents: Map<number, number> = new Map<number, number>();

    for (const venta of ventas) {
      ventasCents = this.safeAdd(
        ventasCents,
        venta.total_cents,
        'El total de ventas de la caja supera el rango numérico seguro.',
      );

      let beneficioMicros: number = 0;
      let descuentoMicros: number = 0;

      for (const linea of lineasPorVenta.get(venta.id) ?? []) {
        const costeMicros: number = this.safeMultiply(
          linea.puc_micros,
          linea.unidades,
          'El coste de una línea de venta supera el rango numérico seguro.',
        );

        beneficioMicros = this.safeAdd(
          beneficioMicros,
          this.safeSubtract(
            linea.importe_micros,
            costeMicros,
            'El beneficio de una línea de venta supera el rango numérico seguro.',
          ),
          'El beneficio de una venta supera el rango numérico seguro.',
        );

        descuentoMicros = this.safeAdd(
          descuentoMicros,
          this.calculateLineaDescuentoMicros(linea),
          'El descuento de una venta supera el rango numérico seguro.',
        );
      }

      const beneficioVentaCents: number = this.microsToCents(beneficioMicros);

      const descuentoVentaCents: number = this.microsToCents(descuentoMicros);

      beneficiosCents = this.safeAdd(
        beneficiosCents,
        beneficioVentaCents,
        'El beneficio de la caja supera el rango numérico seguro.',
      );

      descuentosCents = this.safeAdd(
        descuentosCents,
        descuentoVentaCents,
        'El descuento de la caja supera el rango numérico seguro.',
      );

      const pagosVenta: readonly CajaVentaPagoDatabaseRow[] = pagosPorVenta.get(venta.id) ?? [];

      const descuentosPagos: readonly number[] = this.allocateDiscountByPayments(
        descuentoVentaCents,
        pagosVenta,
      );

      for (let index: number = 0; index < pagosVenta.length; index += 1) {
        const pago: CajaVentaPagoDatabaseRow | undefined = pagosVenta[index];

        const descuentoPago: number | undefined = descuentosPagos[index];

        if (pago === undefined || descuentoPago === undefined) {
          throw new Error('No se ha podido reconstruir el descuento de uno de los pagos.');
        }

        descuentosTipoCents.set(
          pago.id_tipo_pago,
          this.safeAdd(
            descuentosTipoCents.get(pago.id_tipo_pago) ?? 0,
            descuentoPago,
            'El descuento de un tipo de pago supera el rango numérico seguro.',
          ),
        );
      }
    }

    return {
      ventasCents,
      beneficiosCents,
      descuentosCents,
      descuentosTipoCents,
    };
  }

  private calculateLineaDescuentoMicros(linea: CajaVentaLineaDatabaseRow): number {
    if (linea.importe_descuento_micros !== 0) {
      return linea.unidades < 0 ? -linea.importe_descuento_micros : linea.importe_descuento_micros;
    }

    if (linea.descuento_bps === 0) {
      return 0;
    }

    const importeBaseMicros: number = this.safeMultiply(
      linea.pvp_micros,
      linea.unidades,
      'El importe base de una línea supera el rango numérico seguro.',
    );

    const descuentoMicros: number = this.safeSubtract(
      importeBaseMicros,
      linea.importe_micros,
      'El descuento porcentual de una línea supera el rango numérico seguro.',
    );

    if (linea.unidades > 0 && descuentoMicros < 0) {
      throw new Error(
        'El descuento porcentual de una línea positiva no puede aumentar su importe.',
      );
    }

    if (linea.unidades < 0 && descuentoMicros > 0) {
      throw new Error('El descuento porcentual de una devolución no tiene un signo válido.');
    }

    return descuentoMicros;
  }

  private allocateDiscountByPayments(
    descuentoTotalCents: number,
    pagos: readonly CajaVentaPagoDatabaseRow[],
  ): readonly number[] {
    if (pagos.length === 0) {
      return [];
    }

    if (descuentoTotalCents === 0) {
      return pagos.map((): number => 0);
    }

    let totalWeight: number = 0;

    for (const pago of pagos) {
      totalWeight = this.safeAdd(
        totalWeight,
        Math.abs(pago.importe_cents),
        'El reparto del descuento supera el rango numérico seguro.',
      );
    }

    if (totalWeight === 0) {
      /*
       * Las ventas legacy de total cero conservan un único
       * venta_pago también de importe cero para recordar el
       * medio de pago original.
       *
       * Aunque no exista peso económico con el que realizar
       * un reparto proporcional, con un solo pago no existe
       * ninguna ambigüedad: todo el descuento pertenece a
       * ese tipo de pago.
       */
      if (pagos.length === 1) {
        return [descuentoTotalCents];
      }

      throw new Error('No se puede repartir el descuento entre varios pagos sin importe.');
    }

    const sign: number = descuentoTotalCents < 0 ? -1 : 1;

    const totalAbs: number = Math.abs(descuentoTotalCents);

    let allocatedCents: number = 0;

    return pagos.map((pago: CajaVentaPagoDatabaseRow, index: number): number => {
      if (index === pagos.length - 1) {
        return this.safeSubtract(
          descuentoTotalCents,
          allocatedCents,
          'El reparto final del descuento supera el rango numérico seguro.',
        );
      }

      const allocationAbsCents: number = this.roundProportionalInteger(
        totalAbs,
        Math.abs(pago.importe_cents),
        totalWeight,
      );

      const allocationCents: number = sign * allocationAbsCents;

      allocatedCents = this.safeAdd(
        allocatedCents,
        allocationCents,
        'El reparto del descuento supera el rango numérico seguro.',
      );

      return allocationCents;
    });
  }

  private calculateRecuentoTotal(recuento: readonly CerrarCajaRecuentoCommand[]): number {
    if (recuento.length === 0) {
      throw new Error('Es obligatorio realizar el recuento de efectivo antes de cerrar la caja.');
    }

    const denominaciones: Set<number> = new Set<number>();

    let totalCents: number = 0;

    for (const item of recuento) {
      if (
        !Number.isSafeInteger(item.valorCents) ||
        !CAJA_RECUENTO_DENOMINACIONES_CENTS.includes(item.valorCents) ||
        denominaciones.has(item.valorCents)
      ) {
        throw new Error('El recuento de efectivo no es válido.');
      }

      denominaciones.add(item.valorCents);

      if (!Number.isSafeInteger(item.cantidad) || item.cantidad < 0) {
        throw new Error('El recuento de efectivo no es válido.');
      }

      totalCents = this.safeAdd(
        totalCents,
        this.safeMultiply(
          item.valorCents,
          item.cantidad,
          'El recuento de efectivo supera el rango numérico seguro.',
        ),
        'El recuento de efectivo supera el rango numérico seguro.',
      );
    }

    return totalCents;
  }

  private microsToCents(micros: number): number {
    if (!Number.isSafeInteger(micros)) {
      throw new Error('Un importe en microeuros no es válido.');
    }

    const sign: number = micros < 0 ? -1 : 1;

    const cents: number = sign * Math.round(Math.abs(micros) / 10_000);

    if (!Number.isSafeInteger(cents)) {
      throw new Error('La conversión a céntimos supera el rango numérico seguro.');
    }

    return cents;
  }

  private roundProportionalInteger(total: number, part: number, whole: number): number {
    if (
      !Number.isSafeInteger(total) ||
      !Number.isSafeInteger(part) ||
      !Number.isSafeInteger(whole) ||
      total < 0 ||
      part < 0 ||
      whole <= 0
    ) {
      throw new Error('No se puede calcular un reparto proporcional con valores no válidos.');
    }

    const totalBigInt: bigint = BigInt(total);
    const partBigInt: bigint = BigInt(part);
    const wholeBigInt: bigint = BigInt(whole);

    const numerator: bigint = totalBigInt * partBigInt;

    const rounded: bigint = (numerator + wholeBigInt / 2n) / wholeBigInt;

    const result: number = Number(rounded);

    if (!Number.isSafeInteger(result)) {
      throw new Error('El reparto proporcional supera el rango numérico seguro.');
    }

    return result;
  }

  private safeAdd(left: number, right: number, message: string): number {
    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  private safeSubtract(left: number, right: number, message: string): number {
    const result: number = left - right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  private safeMultiply(left: number, right: number, message: string): number {
    const result: number = left * right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  /**
   * Obtiene el snapshot canónico utilizando una transacción ya abierta.
   *
   * Se comparte entre la lectura previa y el cierre definitivo para
   * garantizar que ambas operaciones utilicen exactamente las mismas
   * reglas económicas.
   */
  private async findCierreWithQueryRunner(
    queryRunner: QueryRunner,
    cajaPublicId: string,
  ): Promise<CajaCierreRecord | null> {
    const cajaRows: readonly CajaCierreDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.apertura,
          c.importe_apertura_cents,

          COALESCE(
            (
              SELECT
                SUM(vp.importe_cents)
              FROM venta v

              INNER JOIN venta_pago vp
                ON vp.id_venta = v.id

              INNER JOIN tipo_pago tp
                ON tp.id = vp.id_tipo_pago

              WHERE
                v.id_caja = c.id
                AND v.deleted_at IS NULL
                AND tp.afecta_caja = 1
            ),
            0
          ) AS ventas_afectan_caja_cents,

          COALESCE(
            (
              SELECT
                SUM(mc.importe_cents)
              FROM movimiento_caja mc
              WHERE
                mc.id_caja = c.id
                AND mc.tipo = 'salida'
                AND mc.deleted_at IS NULL
            ),
            0
          ) AS salidas_caja_cents

        FROM caja c

        WHERE
          c.public_id = ?
          AND c.cierre IS NULL

        LIMIT 1
      `,
      [cajaPublicId],
    )) as readonly CajaCierreDatabaseRow[];

    const caja: CajaCierreDatabaseRow | undefined = cajaRows[0];

    if (caja === undefined) {
      return null;
    }

    const tipoPagoRows: readonly CajaCierreTipoPagoDatabaseRow[] = (await queryRunner.query(
      `
    WITH tipos_caja AS (
      /*
       * Tipos que ya estaban asociados explícitamente
       * a la caja.
       */
      SELECT
        ct.id_tipo_pago
      FROM caja_tipo ct
      WHERE
        ct.id_caja = ?

      UNION

      /*
       * Tipos que realmente se han utilizado en ventas
       * activas de la caja.
       *
       * Este segundo origen es necesario especialmente
       * para cajas legacy abiertas, ya que el TPV antiguo
       * solo generaba caja_tipo al cerrar la caja.
       */
      SELECT
        vp.id_tipo_pago
      FROM venta v

      INNER JOIN venta_pago vp
        ON vp.id_venta = v.id

      WHERE
        v.id_caja = ?
        AND v.deleted_at IS NULL
    )

    SELECT
      tp.public_id,
      tp.nombre,
      tp.slug,
      tp.afecta_caja,
      tp.orden,

      COUNT(
        DISTINCT CASE
          WHEN vp.id IS NOT NULL
            THEN v.id
          ELSE NULL
        END
      ) AS operaciones,

      COALESCE(
        SUM(vp.importe_cents),
        0
      ) AS importe_ventas_cents

    FROM tipos_caja tc

    INNER JOIN tipo_pago tp
      ON tp.id = tc.id_tipo_pago

    LEFT JOIN venta v
      ON v.id_caja = ?
      AND v.deleted_at IS NULL

    LEFT JOIN venta_pago vp
      ON vp.id_venta = v.id
      AND vp.id_tipo_pago = tc.id_tipo_pago

    GROUP BY
      tp.id,
      tp.public_id,
      tp.nombre,
      tp.slug,
      tp.afecta_caja,
      tp.orden

    ORDER BY
      tp.orden,
      tp.nombre COLLATE NOCASE,
      tp.id
  `,
      [caja.id, caja.id, caja.id],
    )) as readonly CajaCierreTipoPagoDatabaseRow[];

    const tiposPago: readonly CajaCierreTipoPagoRecord[] = tipoPagoRows.map(
      (row: CajaCierreTipoPagoDatabaseRow): CajaCierreTipoPagoRecord => ({
        publicId: row.public_id,
        nombre: row.nombre,
        slug: row.slug,
        afectaCaja: row.afecta_caja === 1,
        orden: row.orden,
        operaciones: row.operaciones,
        importeVentasCents: row.importe_ventas_cents,
      }),
    );

    return {
      cajaPublicId: caja.public_id,
      apertura: caja.apertura,
      importeAperturaCents: caja.importe_apertura_cents,
      ventasAfectanCajaCents: caja.ventas_afectan_caja_cents,
      salidasCajaCents: caja.salidas_caja_cents,
      tiposPago,
    };
  }

  /**
   * Materializa en caja_tipo cualquier tipo de pago que
   * haya sido utilizado realmente por una venta activa
   * de la caja y todavía no tenga su fila asociada.
   *
   * Es especialmente necesario para cajas abiertas
   * importadas desde el TPV legacy.
   */
  private async ensureCajaTipoRowsForUsedPaymentTypes(
    queryRunner: QueryRunner,
    cajaId: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO caja_tipo (
        id_caja,
        id_tipo_pago,
        operaciones,
        importe_total_cents,
        importe_real_cents,
        importe_descuento_cents,
        created_at,
        updated_at
      )

      SELECT
        ?,
        tipos_usados.id_tipo_pago,
        0,
        0,
        NULL,
        0,
        ?,
        ?

      FROM (
        SELECT DISTINCT
          vp.id_tipo_pago
        FROM venta v

        INNER JOIN venta_pago vp
          ON vp.id_venta = v.id

        WHERE
          v.id_caja = ?
          AND v.deleted_at IS NULL
      ) tipos_usados

      LEFT JOIN caja_tipo ct
        ON ct.id_caja = ?
        AND ct.id_tipo_pago = tipos_usados.id_tipo_pago

      WHERE
        ct.id_tipo_pago IS NULL
    `,
      [cajaId, timestamp, timestamp, cajaId, cajaId],
    );
  }

  /**
   * Resuelve una caja únicamente cuando sigue abierta.
   */
  private async requireOpenCajaId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly IdDatabaseRow[] = (await queryRunner.query(
      `
      SELECT
        c.id
      FROM caja c
      WHERE
        c.public_id = ?
        AND c.cierre IS NULL
      LIMIT 1
    `,
      [publicId],
    )) as readonly IdDatabaseRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('La caja indicada no está abierta.');
    }

    return id;
  }

  /**
   * Recupera una salida activa únicamente cuando
   * pertenece a la caja abierta indicada.
   */
  private async requireEditableSalida(
    queryRunner: QueryRunner,
    publicId: string,
    cajaId: number,
  ): Promise<SalidaCajaEditableDatabaseRow> {
    const rows: readonly SalidaCajaEditableDatabaseRow[] = (await queryRunner.query(
      `
      SELECT
        mc.id,
        mc.created_at
      FROM movimiento_caja mc
      WHERE
        mc.public_id = ?
        AND mc.id_caja = ?
        AND mc.tipo = 'salida'
        AND mc.deleted_at IS NULL
      LIMIT 1
    `,
      [publicId, cajaId],
    )) as readonly SalidaCajaEditableDatabaseRow[];

    const row: SalidaCajaEditableDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('La salida de caja no pertenece a la caja activa o ya no está disponible.');
    }

    return row;
  }

  /**
   * Reconstruye el acumulado de salidas de una caja
   * a partir de sus movimientos todavía activos.
   */
  private async refreshSalidaAggregate(
    queryRunner: QueryRunner,
    cajaId: number,
    updatedAt: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE caja
      SET
        movimientos_salida_cents = (
          SELECT
            COALESCE(
              SUM(mc.importe_cents),
              0
            )
          FROM movimiento_caja mc
          WHERE
            mc.id_caja = ?
            AND mc.tipo = 'salida'
            AND mc.deleted_at IS NULL
        ),
        updated_at = ?
      WHERE id = ?
    `,
      [cajaId, updatedAt, cajaId],
    );
  }

  /**
   * Resuelve el identificador local de un terminal activo mediante su identificador público.
   */
  private async getTerminalId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly TerminalIdDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          t.id
        FROM terminal t
        WHERE
          t.public_id = ?
          AND t.activo = 1
          AND t.deleted_at IS NULL
        LIMIT 1
      `,
      [publicId],
    )) as readonly TerminalIdDatabaseRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('No se ha encontrado el terminal indicado.');
    }

    return id;
  }

  /**
   * Obtiene la caja que ya esté abierta para el terminal.
   */
  private async getCajaAbierta(
    queryRunner: QueryRunner,
    terminalId: number,
  ): Promise<CajaAbiertaRecord | null> {
    const rows: readonly CajaAbiertaDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.id,
          c.public_id,
          c.id_terminal,
          c.apertura,
          c.importe_apertura_cents
        FROM caja c
        WHERE
          c.id_terminal = ?
          AND c.cierre IS NULL
        ORDER BY
          c.apertura DESC,
          c.id DESC
        LIMIT 1
      `,
      [terminalId],
    )) as readonly CajaAbiertaDatabaseRow[];

    const row: CajaAbiertaDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    return this.mapCajaAbierta(row);
  }

  /**
   * Calcula el importe con el que debe comenzar una nueva caja.
   */
  private async getImporteAperturaCents(
    queryRunner: QueryRunner,
    terminalId: number,
  ): Promise<number> {
    const rows: readonly CajaAnteriorDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          c.importe_cierre_real_cents,
          c.movimientos_entrada_cents
        FROM caja c
        WHERE
          c.id_terminal = ?
          AND c.cierre IS NOT NULL
        ORDER BY
          c.cierre DESC,
          c.id DESC
        LIMIT 1
      `,
      [terminalId],
    )) as readonly CajaAnteriorDatabaseRow[];

    const cajaAnterior: CajaAnteriorDatabaseRow | undefined = rows[0];

    if (cajaAnterior === undefined) {
      return 0;
    }

    const importeAperturaCents: number =
      cajaAnterior.importe_cierre_real_cents + cajaAnterior.movimientos_entrada_cents;

    if (!Number.isSafeInteger(importeAperturaCents) || importeAperturaCents < 0) {
      throw new Error('El importe de apertura calculado para la nueva caja no es válido.');
    }

    return importeAperturaCents;
  }

  /**
   * Inicializa los acumulados de la caja para los tipos de pago actualmente activos.
   */
  private async createPaymentTypeRows(
    queryRunner: QueryRunner,
    cajaId: number,
    createdAt: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO caja_tipo (
          id_caja,
          id_tipo_pago,
          operaciones,
          importe_total_cents,
          importe_real_cents,
          importe_descuento_cents,
          created_at,
          updated_at
        )
        SELECT
          ?,
          tp.id,
          0,
          0,
          NULL,
          0,
          ?,
          ?
        FROM tipo_pago tp
        WHERE
          tp.activo = 1
          AND tp.deleted_at IS NULL
      `,
      [cajaId, createdAt, createdAt],
    );
  }

  /**
   * Convierte una fila SQLite en el record de una caja abierta.
   */
  private mapCajaAbierta(row: CajaAbiertaDatabaseRow): CajaAbiertaRecord {
    return {
      id: row.id,
      publicId: row.public_id,
      idTerminal: row.id_terminal,
      apertura: row.apertura,
      importeAperturaCents: row.importe_apertura_cents,
    };
  }
}
