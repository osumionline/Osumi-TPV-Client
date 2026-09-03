import type VentasHistoricoRepository from '@backend/contracts/ventas/ventas-historico.repository.interface';
import type {
  ResumenHistoricoRecord,
  VentaHistoricoClienteRecord,
  VentaHistoricoDetalleRecord,
  VentaHistoricoLineaRecord,
  VentaHistoricoPagoRecord,
  VentaHistoricoPagoResumenRecord,
  VentaHistoricoResumenRecord,
  VentaHistoricoTicketBaiEstadoRecord,
  VentaHistoricoTotalTipoPagoRecord,
  VentasHistoricoResultadoRecord,
} from '@backend/domain/ventas/venta-historico-record.interface';
import type { VentaTicketBaiEstado } from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

const MICROS_PER_CENT: number = 10_000;

interface VentaHistoricoResumenDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly total_cents: number;
  readonly cliente_nombre: string | null;
  readonly ticketbai_estado: VentaTicketBaiEstado | null;
}

interface VentaHistoricoPagoResumenDatabaseRow {
  readonly id_venta: number;
  readonly tipo_pago_public_id: string;
  readonly nombre: string;
  readonly importe_cents: number;
}

interface VentaHistoricoTotalTipoPagoDatabaseRow {
  readonly tipo_pago_public_id: string;
  readonly nombre: string;
  readonly importe_cents: number;
}

interface VentaHistoricoBeneficioDatabaseRow {
  readonly beneficio_micros: number;
}

interface VentaHistoricoDetalleDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly empleado_nombre: string;
  readonly cliente_public_id: string | null;
  readonly cliente_nombre: string | null;
  readonly cliente_email: string | null;
  readonly total_cents: number;
  readonly numero_pagos: number;
  readonly caja_abierta: number;
  readonly facturada: number;
  readonly tiene_lineas_positivas: number;
  readonly ticketbai_estado: VentaTicketBaiEstado | null;
  readonly ticketbai_ultimo_error: string | null;
}

interface VentaHistoricoPagoDatabaseRow {
  readonly tipo_pago_public_id: string;
  readonly nombre: string;
  readonly importe_cents: number;
  readonly entregado_cents: number | null;
  readonly cambio_cents: number;
}

interface VentaHistoricoLineaDatabaseRow {
  readonly id: number;
  readonly localizador: number;
  readonly marca: string;
  readonly descripcion: string;
  readonly unidades: number;
  readonly pvp_micros: number;
  readonly descuento_bps: number;
  readonly importe_descuento_micros: number;
  readonly importe_micros: number;
  readonly regalo: number;
}

interface VentaHistoricoPeriodo {
  readonly desde: string;
  readonly hastaExclusive: string;
  readonly clientePublicId: string | null;
}

export default class TypeOrmVentasHistoricoRepository implements VentasHistoricoRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera las ventas y agregados de un intervalo temporal absoluto,
   * limitado opcionalmente a un cliente.
   */
  async findByPeriod(
    desde: string,
    hastaExclusive: string,
    clientePublicId: string | null = null,
  ): Promise<VentasHistoricoResultadoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();
    const periodo: VentaHistoricoPeriodo = {
      desde,
      hastaExclusive,
      clientePublicId,
    };

    const ventaRows: readonly VentaHistoricoResumenDatabaseRow[] = await this.findVentasPeriodo(
      dataSource,
      periodo,
    );

    const pagoRows: readonly VentaHistoricoPagoResumenDatabaseRow[] = await this.findPagosPeriodo(
      dataSource,
      periodo,
    );

    const pagosPorVenta: ReadonlyMap<number, readonly VentaHistoricoPagoResumenRecord[]> =
      this.groupPagosPorVenta(pagoRows);

    const ventas: readonly VentaHistoricoResumenRecord[] = ventaRows.map(
      (row: VentaHistoricoResumenDatabaseRow): VentaHistoricoResumenRecord => {
        const ticketBaiEstado: VentaHistoricoTicketBaiEstadoRecord = this.mapTicketBaiEstado(
          row.ticketbai_estado,
        );

        return {
          id: row.id,
          publicId: row.public_id,
          serie: row.serie,
          numero: row.numero,
          fecha: row.fecha,
          totalCents: row.total_cents,
          clienteNombre: row.cliente_nombre,
          pagos: pagosPorVenta.get(row.id) ?? [],
          ticketBaiEstado,
          tieneIncidenciaTicketBai: ticketBaiEstado === 'incidencia',
        };
      },
    );

    const resumen: ResumenHistoricoRecord = await this.buildResumen(dataSource, ventaRows, periodo);

    return {
      ventas,
      resumen,
    };
  }

  /**
   * Recupera el detalle histórico completo de una venta.
   */
  async findDetalleByVentaId(idVenta: number): Promise<VentaHistoricoDetalleRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly VentaHistoricoDetalleDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          v.id,
          v.public_id,
          v.serie,
          v.numero,
          v.created_at AS fecha,
          e.nombre AS empleado_nombre,
          c.public_id AS cliente_public_id,
          c.nombre_apellidos AS cliente_nombre,
          c.email AS cliente_email,
          v.total_cents,
          (
            SELECT COUNT(*)
            FROM venta_pago vp
            WHERE vp.id_venta = v.id
          ) AS numero_pagos,
          CASE
            WHEN ca.cierre IS NULL THEN 1
            ELSE 0
          END AS caja_abierta,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM factura_venta fv
              WHERE fv.id_venta = v.id
            ) THEN 1
            ELSE 0
          END AS facturada,
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM linea_venta lv
              WHERE
                lv.id_venta = v.id
                AND lv.unidades > 0
            ) THEN 1
            ELSE 0
          END AS tiene_lineas_positivas,
          vtb.estado AS ticketbai_estado,
          vtb.ultimo_error AS ticketbai_ultimo_error
        FROM venta v

        INNER JOIN empleado e
          ON e.id = v.id_empleado

        INNER JOIN caja ca
          ON ca.id = v.id_caja

         LEFT JOIN cliente c
          ON c.id = v.id_cliente

        LEFT JOIN venta_ticketbai vtb
          ON vtb.id_venta = v.id

        WHERE
          v.id = ?
          AND v.deleted_at IS NULL

        LIMIT 1
      `,
      [idVenta],
    )) as readonly VentaHistoricoDetalleDatabaseRow[];

    const row: VentaHistoricoDetalleDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    const cliente: VentaHistoricoClienteRecord | null =
      row.cliente_public_id === null || row.cliente_nombre === null
        ? null
        : {
            publicId: row.cliente_public_id,
            nombre: row.cliente_nombre,
            email: row.cliente_email,
          };

    const pagos: readonly VentaHistoricoPagoRecord[] = await this.findDetallePagos(
      dataSource,
      idVenta,
    );

    const lineas: readonly VentaHistoricoLineaRecord[] = await this.findDetalleLineas(
      dataSource,
      idVenta,
    );

    const ticketBaiEstado: VentaHistoricoTicketBaiEstadoRecord = this.mapTicketBaiEstado(
      row.ticketbai_estado,
    );
    const puedeProcesarTicketBai: boolean = row.ticketbai_estado === 'pendiente';
    const puedeComprobarTicketBai: boolean =
      row.ticketbai_estado === 'pendiente_remoto' ||
      row.ticketbai_estado === 'enviando' ||
      row.ticketbai_estado === 'error_temporal';
    const puedeReintentarTicketBai: boolean = row.ticketbai_estado === 'rechazada';

    return {
      id: row.id,
      publicId: row.public_id,
      serie: row.serie,
      numero: row.numero,
      fecha: row.fecha,
      empleadoNombre: row.empleado_nombre,
      cliente,
      totalCents: row.total_cents,
      pagos,
      lineas,
      numeroPagos: row.numero_pagos,
      cajaAbierta: row.caja_abierta === 1,
      facturada: row.facturada === 1,
      tieneLineasPositivas: row.tiene_lineas_positivas === 1,
      ticketBaiEstado,
      ticketBaiUltimoError: row.ticketbai_ultimo_error,
      tieneIncidenciaTicketBai: ticketBaiEstado === 'incidencia',
      puedeProcesarTicketBai,
      puedeComprobarTicketBai,
      puedeReintentarTicketBai,
    };
  }

  /**
   * Recupera las cabeceras de venta incluidas en un intervalo.
   */
  private async findVentasPeriodo(
    dataSource: DataSource,
    periodo: VentaHistoricoPeriodo,
  ): Promise<readonly VentaHistoricoResumenDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          v.id,
          v.public_id,
          v.serie,
          v.numero,
          v.created_at AS fecha,
          v.total_cents,
          c.nombre_apellidos AS cliente_nombre,
          vtb.estado AS ticketbai_estado
        FROM venta v

        LEFT JOIN cliente c
          ON c.id = v.id_cliente

        LEFT JOIN venta_ticketbai vtb
          ON vtb.id_venta = v.id

        WHERE
          v.created_at >= ?
          AND v.created_at < ?
          AND v.deleted_at IS NULL
          AND (
            ? IS NULL
            OR v.id_cliente = (
              SELECT cliente_filtro.id
              FROM cliente cliente_filtro
              WHERE cliente_filtro.public_id = ?
              LIMIT 1
            )
          )

        ORDER BY
          v.created_at DESC,
          v.id DESC
      `,
      [periodo.desde, periodo.hastaExclusive, periodo.clientePublicId, periodo.clientePublicId],
    )) as readonly VentaHistoricoResumenDatabaseRow[];
  }

  /**
   * Recupera los pagos de las ventas incluidas en un intervalo.
   */
  private async findPagosPeriodo(
    dataSource: DataSource,
    periodo: VentaHistoricoPeriodo,
  ): Promise<readonly VentaHistoricoPagoResumenDatabaseRow[]> {
    return (await dataSource.query(
      `
        SELECT
          vp.id_venta,
          tp.public_id AS tipo_pago_public_id,
          tp.nombre,
          vp.importe_cents
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        INNER JOIN tipo_pago tp
          ON tp.id = vp.id_tipo_pago

        WHERE
          v.created_at >= ?
          AND v.created_at < ?
          AND v.deleted_at IS NULL
          AND (
            ? IS NULL
            OR v.id_cliente = (
              SELECT cliente_filtro.id
              FROM cliente cliente_filtro
              WHERE cliente_filtro.public_id = ?
              LIMIT 1
            )
          )

        ORDER BY
          vp.id_venta,
          vp.orden,
          vp.id
      `,
      [periodo.desde, periodo.hastaExclusive, periodo.clientePublicId, periodo.clientePublicId],
    )) as readonly VentaHistoricoPagoResumenDatabaseRow[];
  }

  /**
   * Agrupa por venta los pagos recuperados para el listado.
   */
  private groupPagosPorVenta(
    rows: readonly VentaHistoricoPagoResumenDatabaseRow[],
  ): ReadonlyMap<number, readonly VentaHistoricoPagoResumenRecord[]> {
    const result: Map<number, VentaHistoricoPagoResumenRecord[]> = new Map<
      number,
      VentaHistoricoPagoResumenRecord[]
    >();

    for (const row of rows) {
      const pagos: VentaHistoricoPagoResumenRecord[] = result.get(row.id_venta) ?? [];

      pagos.push({
        tipoPagoPublicId: row.tipo_pago_public_id,
        nombre: row.nombre,
        importeCents: row.importe_cents,
      });

      result.set(row.id_venta, pagos);
    }

    return result;
  }

  /**
   * Construye los agregados económicos del intervalo consultado.
   */
  private async buildResumen(
    dataSource: DataSource,
    ventaRows: readonly VentaHistoricoResumenDatabaseRow[],
    periodo: VentaHistoricoPeriodo,
  ): Promise<ResumenHistoricoRecord> {
    let totalCents: number = 0;

    for (const venta of ventaRows) {
      totalCents = this.safeAdd(
        totalCents,
        venta.total_cents,
        'El total del histórico supera el rango numérico seguro.',
      );
    }

    const numeroVentas: number = ventaRows.length;

    const ticketMedioCents: number =
      numeroVentas === 0 ? 0 : this.roundSignedDivision(totalCents, numeroVentas);

    const beneficioMicros: number = await this.findBeneficioMicros(dataSource, periodo);

    const totalesPorTipoPago: readonly VentaHistoricoTotalTipoPagoRecord[] =
      await this.findTotalesTipoPago(dataSource, periodo);

    return {
      numeroVentas,
      totalCents,
      ticketMedioCents,
      beneficioCents: this.microsToCents(beneficioMicros),
      totalesPorTipoPago,
    };
  }

  /**
   * Calcula el beneficio firmado del intervalo en microeuros.
   */
  private async findBeneficioMicros(
    dataSource: DataSource,
    periodo: VentaHistoricoPeriodo,
  ): Promise<number> {
    const rows: readonly VentaHistoricoBeneficioDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          COALESCE(
            SUM(
              lv.importe_micros
              - (lv.puc_micros * lv.unidades)
            ),
            0
          ) AS beneficio_micros
        FROM linea_venta lv

        INNER JOIN venta v
          ON v.id = lv.id_venta

        WHERE
          v.created_at >= ?
          AND v.created_at < ?
          AND v.deleted_at IS NULL
          AND (
            ? IS NULL
            OR v.id_cliente = (
              SELECT cliente_filtro.id
              FROM cliente cliente_filtro
              WHERE cliente_filtro.public_id = ?
              LIMIT 1
            )
          )
      `,
      [periodo.desde, periodo.hastaExclusive, periodo.clientePublicId, periodo.clientePublicId],
    )) as readonly VentaHistoricoBeneficioDatabaseRow[];

    const beneficioMicros: number = rows[0]?.beneficio_micros ?? 0;

    if (!Number.isSafeInteger(beneficioMicros)) {
      throw new Error('El beneficio del histórico supera el rango numérico seguro.');
    }

    return beneficioMicros;
  }

  /**
   * Recupera el total firmado del intervalo para cada tipo de pago utilizado.
   */
  private async findTotalesTipoPago(
    dataSource: DataSource,
    periodo: VentaHistoricoPeriodo,
  ): Promise<readonly VentaHistoricoTotalTipoPagoRecord[]> {
    const rows: readonly VentaHistoricoTotalTipoPagoDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          tp.public_id AS tipo_pago_public_id,
          tp.nombre,
          SUM(vp.importe_cents) AS importe_cents
        FROM venta_pago vp

        INNER JOIN venta v
          ON v.id = vp.id_venta

        INNER JOIN tipo_pago tp
          ON tp.id = vp.id_tipo_pago

        WHERE
          v.created_at >= ?
          AND v.created_at < ?
          AND v.deleted_at IS NULL
          AND (
            ? IS NULL
            OR v.id_cliente = (
              SELECT cliente_filtro.id
              FROM cliente cliente_filtro
              WHERE cliente_filtro.public_id = ?
              LIMIT 1
            )
          )

        GROUP BY
          tp.id,
          tp.public_id,
          tp.nombre

        ORDER BY
          tp.nombre COLLATE NOCASE,
          tp.id
      `,
      [periodo.desde, periodo.hastaExclusive, periodo.clientePublicId, periodo.clientePublicId],
    )) as readonly VentaHistoricoTotalTipoPagoDatabaseRow[];

    return rows.map(
      (row: VentaHistoricoTotalTipoPagoDatabaseRow): VentaHistoricoTotalTipoPagoRecord => ({
        tipoPagoPublicId: row.tipo_pago_public_id,
        nombre: row.nombre,
        importeCents: row.importe_cents,
      }),
    );
  }

  /**
   * Recupera los pagos completos de una venta en su orden original.
   */
  private async findDetallePagos(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaHistoricoPagoRecord[]> {
    const rows: readonly VentaHistoricoPagoDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          tp.public_id AS tipo_pago_public_id,
          tp.nombre,
          vp.importe_cents,
          vp.entregado_cents,
          vp.cambio_cents
        FROM venta_pago vp

        INNER JOIN tipo_pago tp
          ON tp.id = vp.id_tipo_pago

        WHERE vp.id_venta = ?

        ORDER BY
          vp.orden,
          vp.id
      `,
      [idVenta],
    )) as readonly VentaHistoricoPagoDatabaseRow[];

    return rows.map((row: VentaHistoricoPagoDatabaseRow): VentaHistoricoPagoRecord => ({
      tipoPagoPublicId: row.tipo_pago_public_id,
      nombre: row.nombre,
      importeCents: row.importe_cents,
      entregadoCents: row.entregado_cents,
      cambioCents: row.cambio_cents,
    }));
  }

  /**
   * Recupera las líneas históricas de una venta sin consultar el catálogo mutable.
   */
  private async findDetalleLineas(
    dataSource: DataSource,
    idVenta: number,
  ): Promise<readonly VentaHistoricoLineaRecord[]> {
    const rows: readonly VentaHistoricoLineaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          lv.id,
          lv.localizador,
          lv.marca,
          lv.nombre_articulo AS descripcion,
          lv.unidades,
          lv.pvp_micros,
          lv.descuento_bps,
          lv.importe_descuento_micros,
          lv.importe_micros,
          lv.regalo
        FROM linea_venta lv
        WHERE lv.id_venta = ?
        ORDER BY lv.id
      `,
      [idVenta],
    )) as readonly VentaHistoricoLineaDatabaseRow[];

    return rows.map((row: VentaHistoricoLineaDatabaseRow): VentaHistoricoLineaRecord => ({
      id: row.id,
      localizador: row.localizador,
      marca: row.marca,
      descripcion: row.descripcion,
      unidades: row.unidades,
      pvpMicros: row.pvp_micros,
      descuentoBps: row.descuento_bps,
      importeDescuentoMicros: row.importe_descuento_micros,
      importeMicros: row.importe_micros,
      regalo: row.regalo === 1,
    }));
  }

  /**
   * Reduce el estado fiscal persistido al estado
   * operativo que necesita el Histórico.
   */
  private mapTicketBaiEstado(
    estado: VentaTicketBaiEstado | null,
  ): VentaHistoricoTicketBaiEstadoRecord {
    if (estado === null || estado === 'no_aplica') {
      return 'no_aplica';
    }

    if (estado === 'aceptada' || estado === 'legacy' || estado === 'anulada') {
      return 'correcto';
    }

    if (estado === 'pendiente' || estado === 'pendiente_remoto') {
      return 'pendiente';
    }

    return 'incidencia';
  }

  /**
   * Convierte microeuros a céntimos manteniendo un redondeo simétrico para signos.
   */
  private microsToCents(micros: number): number {
    if (!Number.isSafeInteger(micros)) {
      throw new Error('Un importe en microeuros del histórico no es válido.');
    }

    const sign: number = micros < 0 ? -1 : 1;
    const cents: number = sign * Math.round(Math.abs(micros) / MICROS_PER_CENT);

    if (!Number.isSafeInteger(cents)) {
      throw new Error('Un importe del histórico supera el rango numérico seguro.');
    }

    return cents;
  }

  /**
   * Divide y redondea un entero firmado manteniendo simetría entre positivos y negativos.
   */
  private roundSignedDivision(value: number, divisor: number): number {
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(divisor) || divisor <= 0) {
      throw new Error('No se puede calcular el ticket medio con valores no válidos.');
    }

    const sign: number = value < 0 ? -1 : 1;
    const result: number = sign * Math.round(Math.abs(value) / divisor);

    if (!Number.isSafeInteger(result)) {
      throw new Error('El ticket medio supera el rango numérico seguro.');
    }

    return result;
  }

  /**
   * Suma dos enteros comprobando que el resultado siga dentro del rango seguro.
   */
  private safeAdd(left: number, right: number, message: string): number {
    const result: number = left + right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }
}
