import type VentasPostventaRepository from '@backend/contracts/ventas/ventas-postventa.repository.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import type { DataSource, QueryRunner } from 'typeorm';

const EFECTIVO_SLUG: string = 'efectivo';
const MICROS_PER_CENT: number = 10_000;

interface VentaClienteDatabaseRow {
  readonly id: number;
  readonly id_cliente: number | null;
}

interface VentaPagoContextDatabaseRow {
  readonly id: number;
  readonly id_caja: number;
  readonly total_cents: number;
  readonly cierre: string | null;
}

interface VentaPagoDatabaseRow {
  readonly id: number;
  readonly id_tipo_pago: number;
  readonly importe_cents: number;
  readonly entregado_cents: number | null;
  readonly cambio_cents: number;
}

interface TipoPagoDatabaseRow {
  readonly id: number;
  readonly slug: string;
  readonly afecta_caja: number;
}

interface DatabaseIdRow {
  readonly id: number;
}

interface CajaTipoDatabaseRow {
  readonly operaciones: number;
  readonly importe_total_cents: number;
  readonly importe_descuento_cents: number;
}

interface CajaDatabaseRow {
  readonly importe_cierre_teorico_cents: number;
}

interface LineaDescuentoDatabaseRow {
  readonly pvp_micros: number;
  readonly importe_micros: number;
  readonly descuento_bps: number;
  readonly importe_descuento_micros: number;
  readonly unidades: number;
}

export default class TypeOrmVentasPostventaRepository implements VentasPostventaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Cambia el cliente de una venta sin modificar sus
   * relaciones ni los documentos ya emitidos.
   */
  async cambiarCliente(idVenta: number, clientePublicId: string | null): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const venta: VentaClienteDatabaseRow = await this.requireVentaCliente(queryRunner, idVenta);

      const idCliente: number | null = await this.resolveClienteId(queryRunner, clientePublicId);

      if (venta.id_cliente === idCliente) {
        return;
      }

      const timestamp: string = new Date().toISOString();

      await queryRunner.query(
        `
            UPDATE venta
            SET
              id_cliente = ?,
              ticket_revision = ticket_revision + 1,
              updated_at = ?
            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
        [idCliente, timestamp, idVenta],
      );
    });
  }

  /**
   * Sustituye el único pago de una venta manteniendo
   * sincronizados venta_pago, caja_tipo y cierre teórico.
   */
  async cambiarTipoPago(idVenta: number, tipoPagoPublicId: string): Promise<void> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    await runDataSourceTransaction(dataSource, async (queryRunner: QueryRunner): Promise<void> => {
      const venta: VentaPagoContextDatabaseRow = await this.requireVentaPagoContext(
        queryRunner,
        idVenta,
      );

      if (venta.cierre !== null) {
        throw new Error(
          'No se puede cambiar el tipo de pago porque la caja original ya está cerrada.',
        );
      }

      if (venta.total_cents === 0) {
        throw new Error('No se puede cambiar el tipo de pago de una venta con total cero.');
      }

      const pago: VentaPagoDatabaseRow = await this.requireSinglePago(queryRunner, idVenta);

      this.validatePagoSign(venta.total_cents, pago.importe_cents);

      const tipoPagoAnterior: TipoPagoDatabaseRow = await this.requireTipoPagoById(
        queryRunner,
        pago.id_tipo_pago,
      );

      const tipoPagoNuevo: TipoPagoDatabaseRow = await this.requireTipoPagoActivo(
        queryRunner,
        tipoPagoPublicId,
      );

      if (tipoPagoAnterior.id === tipoPagoNuevo.id) {
        return;
      }

      const descuentoCents: number = await this.calculateVentaDescuentoCents(queryRunner, idVenta);

      const timestamp: string = new Date().toISOString();

      await this.removeCajaTipoImpact(
        queryRunner,
        venta.id_caja,
        tipoPagoAnterior.id,
        pago.importe_cents,
        descuentoCents,
        timestamp,
      );

      await this.addCajaTipoImpact(
        queryRunner,
        venta.id_caja,
        tipoPagoNuevo.id,
        pago.importe_cents,
        descuentoCents,
        timestamp,
      );

      await this.updateCajaCierreTeorico(
        queryRunner,
        venta.id_caja,
        pago.importe_cents,
        tipoPagoAnterior,
        tipoPagoNuevo,
        timestamp,
      );

      const entregadoCents: number | null = this.getNuevoEntregadoCents(
        venta.total_cents,
        pago.importe_cents,
        tipoPagoNuevo,
      );

      await queryRunner.query(
        `
            UPDATE venta_pago
            SET
              id_tipo_pago = ?,
              entregado_cents = ?,
              cambio_cents = 0,
              updated_at = ?
            WHERE id = ?
          `,
        [tipoPagoNuevo.id, entregadoCents, timestamp, pago.id],
      );

      await queryRunner.query(
        `
            UPDATE venta
            SET
              ticket_revision = ticket_revision + 1,
              updated_at = ?
            WHERE id = ?
          `,
        [timestamp, idVenta],
      );
    });
  }

  /**
   * Recupera los hechos necesarios para modificar
   * el cliente de una venta.
   */
  private async requireVentaCliente(
    queryRunner: QueryRunner,
    idVenta: number,
  ): Promise<VentaClienteDatabaseRow> {
    const rows: readonly VentaClienteDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          v.id,
          v.id_cliente
        FROM venta v
        WHERE
          v.id = ?
          AND v.deleted_at IS NULL
        LIMIT 1
      `,
      [idVenta],
    )) as readonly VentaClienteDatabaseRow[];

    const venta: VentaClienteDatabaseRow | undefined = rows[0];

    if (venta === undefined) {
      throw new Error('La venta indicada ya no está disponible.');
    }

    return venta;
  }

  /**
   * Recupera la venta y su caja original para una
   * corrección del medio de pago.
   */
  private async requireVentaPagoContext(
    queryRunner: QueryRunner,
    idVenta: number,
  ): Promise<VentaPagoContextDatabaseRow> {
    const rows: readonly VentaPagoContextDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            v.id,
            v.id_caja,
            v.total_cents,
            c.cierre
          FROM venta v

          INNER JOIN caja c
            ON c.id = v.id_caja

          WHERE
            v.id = ?
            AND v.deleted_at IS NULL

          LIMIT 1
        `,
      [idVenta],
    )) as readonly VentaPagoContextDatabaseRow[];

    const venta: VentaPagoContextDatabaseRow | undefined = rows[0];

    if (venta === undefined) {
      throw new Error('La venta indicada ya no está disponible.');
    }

    return venta;
  }

  /**
   * Recupera el único pago de una venta y rechaza
   * ventas sin pago o con pagos múltiples.
   */
  private async requireSinglePago(
    queryRunner: QueryRunner,
    idVenta: number,
  ): Promise<VentaPagoDatabaseRow> {
    const rows: readonly VentaPagoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            id_tipo_pago,
            importe_cents,
            entregado_cents,
            cambio_cents
          FROM venta_pago
          WHERE id_venta = ?
          ORDER BY orden, id
        `,
      [idVenta],
    )) as readonly VentaPagoDatabaseRow[];

    if (rows.length !== 1) {
      throw new Error('Solo se puede cambiar el tipo de pago de una venta con un único pago.');
    }

    const pago: VentaPagoDatabaseRow | undefined = rows[0];

    if (pago === undefined) {
      throw new Error('No se ha podido recuperar el pago de la venta.');
    }

    return pago;
  }

  /**
   * Resuelve un cliente activo o null.
   */
  private async resolveClienteId(
    queryRunner: QueryRunner,
    publicId: string | null,
  ): Promise<number | null> {
    if (publicId === null) {
      return null;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT id
          FROM cliente
          WHERE
            public_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('El cliente seleccionado ya no está disponible.');
    }

    return id;
  }

  /**
   * Recupera un tipo de pago histórico por su ID interno.
   *
   * No exige que siga activo porque necesitamos retirar
   * correctamente el impacto de un medio usado en el pasado.
   */
  private async requireTipoPagoById(
    queryRunner: QueryRunner,
    idTipoPago: number,
  ): Promise<TipoPagoDatabaseRow> {
    const rows: readonly TipoPagoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            slug,
            afecta_caja
          FROM tipo_pago
          WHERE id = ?
          LIMIT 1
        `,
      [idTipoPago],
    )) as readonly TipoPagoDatabaseRow[];

    const tipoPago: TipoPagoDatabaseRow | undefined = rows[0];

    if (tipoPago === undefined) {
      throw new Error('El tipo de pago original de la venta ya no está disponible.');
    }

    return tipoPago;
  }

  /**
   * Resuelve un nuevo tipo de pago activo y físico.
   */
  private async requireTipoPagoActivo(
    queryRunner: QueryRunner,
    publicId: string,
  ): Promise<TipoPagoDatabaseRow> {
    const rows: readonly TipoPagoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            slug,
            afecta_caja
          FROM tipo_pago
          WHERE
            public_id = ?
            AND fisico = 1
            AND activo = 1
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly TipoPagoDatabaseRow[];

    const tipoPago: TipoPagoDatabaseRow | undefined = rows[0];

    if (tipoPago === undefined) {
      throw new Error('El tipo de pago seleccionado ya no está disponible.');
    }

    return tipoPago;
  }

  /**
   * Retira de caja_tipo el impacto original de la venta.
   */
  private async removeCajaTipoImpact(
    queryRunner: QueryRunner,
    idCaja: number,
    idTipoPago: number,
    importeCents: number,
    descuentoCents: number,
    timestamp: string,
  ): Promise<void> {
    const rows: readonly CajaTipoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            operaciones,
            importe_total_cents,
            importe_descuento_cents
          FROM caja_tipo
          WHERE
            id_caja = ?
            AND id_tipo_pago = ?
          LIMIT 1
        `,
      [idCaja, idTipoPago],
    )) as readonly CajaTipoDatabaseRow[];

    const cajaTipo: CajaTipoDatabaseRow | undefined = rows[0];

    if (cajaTipo === undefined || cajaTipo.operaciones <= 0) {
      throw new Error('Los acumulados originales del tipo de pago no son válidos.');
    }

    const operaciones: number = this.safeSubtract(
      cajaTipo.operaciones,
      1,
      'El número de operaciones del tipo de pago no es válido.',
    );

    const importeTotalCents: number = this.safeSubtract(
      cajaTipo.importe_total_cents,
      importeCents,
      'El acumulado original del tipo de pago supera el rango numérico seguro.',
    );

    const importeDescuentoCents: number = this.safeSubtract(
      cajaTipo.importe_descuento_cents,
      descuentoCents,
      'El descuento original del tipo de pago supera el rango numérico seguro.',
    );

    await queryRunner.query(
      `
        UPDATE caja_tipo
        SET
          operaciones = ?,
          importe_total_cents = ?,
          importe_descuento_cents = ?,
          updated_at = ?
        WHERE
          id_caja = ?
          AND id_tipo_pago = ?
      `,
      [operaciones, importeTotalCents, importeDescuentoCents, timestamp, idCaja, idTipoPago],
    );
  }

  /**
   * Añade a caja_tipo el impacto de la venta
   * usando el nuevo medio de pago.
   */
  private async addCajaTipoImpact(
    queryRunner: QueryRunner,
    idCaja: number,
    idTipoPago: number,
    importeCents: number,
    descuentoCents: number,
    timestamp: string,
  ): Promise<void> {
    const rows: readonly CajaTipoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            operaciones,
            importe_total_cents,
            importe_descuento_cents
          FROM caja_tipo
          WHERE
            id_caja = ?
            AND id_tipo_pago = ?
          LIMIT 1
        `,
      [idCaja, idTipoPago],
    )) as readonly CajaTipoDatabaseRow[];

    const cajaTipo: CajaTipoDatabaseRow | undefined = rows[0];

    if (cajaTipo === undefined) {
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
          VALUES (
            ?, ?, 1, ?, NULL, ?, ?, ?
          )
        `,
        [idCaja, idTipoPago, importeCents, descuentoCents, timestamp, timestamp],
      );

      return;
    }

    const operaciones: number = this.safeAdd(
      cajaTipo.operaciones,
      1,
      'El número de operaciones del nuevo tipo de pago supera el rango numérico seguro.',
    );

    const importeTotalCents: number = this.safeAdd(
      cajaTipo.importe_total_cents,
      importeCents,
      'El acumulado del nuevo tipo de pago supera el rango numérico seguro.',
    );

    const importeDescuentoCents: number = this.safeAdd(
      cajaTipo.importe_descuento_cents,
      descuentoCents,
      'El descuento del nuevo tipo de pago supera el rango numérico seguro.',
    );

    await queryRunner.query(
      `
        UPDATE caja_tipo
        SET
          operaciones = ?,
          importe_total_cents = ?,
          importe_descuento_cents = ?,
          updated_at = ?
        WHERE
          id_caja = ?
          AND id_tipo_pago = ?
      `,
      [operaciones, importeTotalCents, importeDescuentoCents, timestamp, idCaja, idTipoPago],
    );
  }

  /**
   * Traslada en caja el impacto que depende de afecta_caja.
   */
  private async updateCajaCierreTeorico(
    queryRunner: QueryRunner,
    idCaja: number,
    importeCents: number,
    tipoPagoAnterior: TipoPagoDatabaseRow,
    tipoPagoNuevo: TipoPagoDatabaseRow,
    timestamp: string,
  ): Promise<void> {
    const impactoAnterior: number = tipoPagoAnterior.afecta_caja === 1 ? importeCents : 0;

    const impactoNuevo: number = tipoPagoNuevo.afecta_caja === 1 ? importeCents : 0;

    const diferencia: number = this.safeSubtract(
      impactoNuevo,
      impactoAnterior,
      'El cambio de impacto sobre la caja supera el rango numérico seguro.',
    );

    if (diferencia === 0) {
      return;
    }

    const rows: readonly CajaDatabaseRow[] = (await queryRunner.query(
      `
          SELECT importe_cierre_teorico_cents
          FROM caja
          WHERE
            id = ?
            AND cierre IS NULL
          LIMIT 1
        `,
      [idCaja],
    )) as readonly CajaDatabaseRow[];

    const caja: CajaDatabaseRow | undefined = rows[0];

    if (caja === undefined) {
      throw new Error('La caja original de la venta ya no está abierta.');
    }

    const cierreTeoricoCents: number = this.safeAdd(
      caja.importe_cierre_teorico_cents,
      diferencia,
      'El importe teórico de la caja supera el rango numérico seguro.',
    );

    await queryRunner.query(
      `
        UPDATE caja
        SET
          importe_cierre_teorico_cents = ?,
          updated_at = ?
        WHERE
          id = ?
          AND cierre IS NULL
      `,
      [cierreTeoricoCents, timestamp, idCaja],
    );
  }

  /**
   * Calcula el descuento total de la venta con la misma
   * semántica utilizada durante su persistencia original.
   */
  private async calculateVentaDescuentoCents(
    queryRunner: QueryRunner,
    idVenta: number,
  ): Promise<number> {
    const rows: readonly LineaDescuentoDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            pvp_micros,
            importe_micros,
            descuento_bps,
            importe_descuento_micros,
            unidades
          FROM linea_venta
          WHERE id_venta = ?
        `,
      [idVenta],
    )) as readonly LineaDescuentoDatabaseRow[];

    let descuentoMicros: number = 0;

    for (const linea of rows) {
      descuentoMicros = this.safeAdd(
        descuentoMicros,
        this.calculateLineaDescuentoMicros(linea),
        'El descuento total de la venta supera el rango numérico seguro.',
      );
    }

    return this.microsToCents(descuentoMicros);
  }

  /**
   * Calcula el descuento firmado de una línea persistida.
   */
  private calculateLineaDescuentoMicros(linea: LineaDescuentoDatabaseRow): number {
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

  /**
   * Normaliza el efectivo entregado para el nuevo medio de pago.
   */
  private getNuevoEntregadoCents(
    totalCents: number,
    importeCents: number,
    tipoPago: TipoPagoDatabaseRow,
  ): number | null {
    const esEfectivo: boolean = tipoPago.slug.toLocaleLowerCase() === EFECTIVO_SLUG;

    if (!esEfectivo || totalCents < 0) {
      return null;
    }

    return importeCents;
  }

  /**
   * Comprueba que pago y venta mantienen el mismo signo económico.
   */
  private validatePagoSign(totalCents: number, importeCents: number): void {
    if ((totalCents > 0 && importeCents <= 0) || (totalCents < 0 && importeCents >= 0)) {
      throw new Error('El pago histórico de la venta no tiene un signo válido.');
    }
  }

  /**
   * Convierte microeuros a céntimos con redondeo firmado.
   */
  private microsToCents(micros: number): number {
    if (!Number.isSafeInteger(micros)) {
      throw new Error('Un importe en microeuros no es válido.');
    }

    const sign: number = micros < 0 ? -1 : 1;

    const cents: number = sign * Math.round(Math.abs(micros) / MICROS_PER_CENT);

    if (!Number.isSafeInteger(cents)) {
      throw new Error('Un importe convertido a céntimos supera el rango numérico seguro.');
    }

    return cents;
  }

  /**
   * Multiplica dos enteros comprobando el rango seguro.
   */
  private safeMultiply(left: number, right: number, message: string): number {
    const result: number = left * right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  /**
   * Suma dos enteros comprobando el rango seguro.
   */
  private safeAdd(left: number, right: number, message: string): number {
    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  /**
   * Resta dos enteros comprobando el rango seguro.
   */
  private safeSubtract(left: number, right: number, message: string): number {
    const result: number = left - right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }
}
