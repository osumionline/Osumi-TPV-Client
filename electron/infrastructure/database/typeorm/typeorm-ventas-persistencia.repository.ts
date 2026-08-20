import type {
  GuardarVentaLineaRecordCommand,
  GuardarVentaPagoRecordCommand,
  GuardarVentaRecordCommand,
} from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import { getLastInsertId } from '@infrastructure/database/typeorm/sqlite.utils';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import { randomUUID } from 'node:crypto';
import type { DataSource, QueryRunner } from 'typeorm';

const VENTA_DOCUMENT_TYPE: string = 'venta';
const VENTA_SERIE: string = '';
const EFECTIVO_SLUG: string = 'efectivo';

const HISTORICO_ARTICULO_TIPO_VENTA: number = 1;
const MICROS_PER_CENT: number = 10_000;

interface DatabaseIdRow {
  readonly id: number;
}

interface ExistingVentaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly serie: string;
  readonly numero: number;
  readonly total_cents: number;
  readonly created_at: string;
}

interface TipoPagoDatabaseRow {
  readonly id: number;
  readonly slug: string;
  readonly afecta_caja: number;
  readonly fisico: number;
}

interface ReservaDatabaseRow {
  readonly id: number;
  readonly id_cliente: number;
}

interface LineaVentaOrigenDatabaseRow {
  readonly id: number;
  readonly id_articulo: number | null;
}

interface LineaReservaOrigenDatabaseRow {
  readonly id: number;
  readonly id_reserva: number;
  readonly id_articulo: number | null;
}

interface LineaVentaDevolucionStockDatabaseRow {
  readonly id: number;
  readonly id_articulo: number | null;
  readonly unidades: number;
  readonly unidades_devueltas: number;
  readonly puc_micros: number;
  readonly pvp_micros: number;
}

interface LineaReservaStockDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_reserva: number;
  readonly id_articulo: number | null;
  readonly puc_micros: number;
  readonly pvp_cents: number;
  readonly unidades: number;
}

interface ArticuloStockDatabaseRow {
  readonly stock: number;
}

interface CajaAcumuladosDatabaseRow {
  readonly ventas_cents: number;
  readonly beneficios_cents: number;
  readonly descuentos_cents: number;
  readonly importe_cierre_teorico_cents: number;
}

interface CajaTipoAcumuladosDatabaseRow {
  readonly operaciones: number;
  readonly importe_total_cents: number;
  readonly importe_descuento_cents: number;
}

interface VentaCajaSummary {
  readonly beneficioCents: number;
  readonly descuentoCents: number;
  readonly cierreTeoricoImpactCents: number;
}

interface SecuenciaDatabaseRow {
  readonly ultimo_numero: number;
}

export default class TypeOrmVentasPersistenciaRepository implements VentasPersistenciaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async save(command: GuardarVentaRecordCommand): Promise<VentaPersistidaRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    try {
      return await runDataSourceTransaction(
        dataSource,
        async (queryRunner: QueryRunner): Promise<VentaPersistidaRecord> => {
          const existingVenta: VentaPersistidaRecord | null = await this.findExistingVenta(
            queryRunner,
            command,
          );

          if (existingVenta !== null) {
            return existingVenta;
          }

          const timestamp: string = new Date().toISOString();

          const idCaja: number = await this.resolveCajaId(queryRunner, command.cajaPublicId);

          const idEmpleado: number = await this.resolveEmpleadoId(
            queryRunner,
            command.empleadoPublicId,
          );

          const idCliente: number | null = await this.resolveClienteId(
            queryRunner,
            command.clientePublicId,
          );

          const idVentaOrigenDevolucion: number | null = await this.resolveVentaOrigenDevolucionId(
            queryRunner,
            command.devolucionVentaOrigenPublicId,
          );

          const reservas: ReadonlyMap<string, ReservaDatabaseRow> = await this.resolveReservas(
            queryRunner,
            command.reservasOrigenPublicIds,
            idCliente,
          );

          const tiposPago: ReadonlyMap<string, TipoPagoDatabaseRow> = await this.resolveTiposPago(
            queryRunner,
            command,
          );

          const numero: number = await this.nextVentaNumber(queryRunner, timestamp);

          await this.insertVenta(
            queryRunner,
            command,
            idCaja,
            idEmpleado,
            idCliente,
            idVentaOrigenDevolucion,
            numero,
            timestamp,
          );

          const idVenta: number = await getLastInsertId(
            queryRunner,
            'No se ha podido obtener el identificador de la venta creada.',
          );

          await this.insertReservasOrigen(queryRunner, idVenta, reservas, timestamp);

          for (const linea of command.lineas) {
            await this.insertLinea(
              queryRunner,
              idVenta,
              idVentaOrigenDevolucion,
              reservas,
              linea,
              timestamp,
            );
          }

          for (let index: number = 0; index < command.pagos.length; index += 1) {
            const pago: GuardarVentaPagoRecordCommand | undefined = command.pagos[index];

            if (pago === undefined) {
              throw new Error('No se ha podido recuperar uno de los pagos de la venta.');
            }

            const tipoPago: TipoPagoDatabaseRow | undefined = tiposPago.get(pago.tipoPagoPublicId);

            if (tipoPago === undefined) {
              throw new Error('No se ha podido resolver uno de los tipos de pago de la venta.');
            }

            await this.insertPago(queryRunner, idVenta, tipoPago.id, index, pago, timestamp);
          }

          await this.reconcileStockAndOrigins(
            queryRunner,
            idVenta,
            idVentaOrigenDevolucion,
            reservas,
            command,
            timestamp,
          );

          await this.updateCajaAcumulados(queryRunner, idCaja, command, tiposPago, timestamp);

          return {
            id: idVenta,
            publicId: command.publicId,
            serie: VENTA_SERIE,
            numero,
            totalCents: command.totalCents,
            fecha: timestamp,
          };
        },
      );
    } catch (error: unknown) {
      throw new Error(
        error instanceof Error ? error.message : 'No se ha podido guardar la venta.',
        {
          cause: error,
        },
      );
    }
  }

  private async findExistingVenta(
    queryRunner: QueryRunner,
    command: GuardarVentaRecordCommand,
  ): Promise<VentaPersistidaRecord | null> {
    const rows: readonly ExistingVentaDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            id,
            public_id,
            serie,
            numero,
            total_cents,
            created_at
          FROM venta
          WHERE public_id = ?
          LIMIT 1
        `,
      [command.publicId],
    )) as readonly ExistingVentaDatabaseRow[];

    const row: ExistingVentaDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      return null;
    }

    if (row.total_cents !== command.totalCents) {
      throw new Error(
        'Ya existe una venta con el mismo identificador pero con un total diferente.',
      );
    }

    return {
      id: row.id,
      publicId: row.public_id,
      serie: row.serie,
      numero: row.numero,
      totalCents: row.total_cents,
      fecha: row.created_at,
    };
  }

  private async resolveCajaId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT
            id
          FROM caja
          WHERE
            public_id = ?
            AND cierre IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    return this.requireDatabaseId(
      rows[0]?.id,
      'La caja con la que se inició la operación ya no está abierta.',
    );
  }

  private async resolveEmpleadoId(queryRunner: QueryRunner, publicId: string): Promise<number> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT
            id
          FROM empleado
          WHERE
            public_id = ?
            AND activo = 1
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    return this.requireDatabaseId(
      rows[0]?.id,
      'El empleado asociado a la venta ya no está disponible.',
    );
  }

  private async resolveClienteId(
    queryRunner: QueryRunner,
    publicId: string | null,
  ): Promise<number | null> {
    if (publicId === null) {
      return null;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT
            id
          FROM cliente
          WHERE
            public_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    return this.requireDatabaseId(
      rows[0]?.id,
      'El cliente asociado a la venta ya no está disponible.',
    );
  }

  private async resolveVentaOrigenDevolucionId(
    queryRunner: QueryRunner,
    publicId: string | null,
  ): Promise<number | null> {
    if (publicId === null) {
      return null;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT
            id
          FROM venta
          WHERE
            public_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    return this.requireDatabaseId(
      rows[0]?.id,
      'La venta origen de la devolución ya no está disponible.',
    );
  }

  private async resolveReservas(
    queryRunner: QueryRunner,
    publicIds: readonly string[],
    idCliente: number | null,
  ): Promise<ReadonlyMap<string, ReservaDatabaseRow>> {
    if (publicIds.length === 0) {
      return new Map<string, ReservaDatabaseRow>();
    }

    if (idCliente === null) {
      throw new Error('Una venta procedente de reservas debe tener un cliente.');
    }

    const reservas: Map<string, ReservaDatabaseRow> = new Map<string, ReservaDatabaseRow>();

    for (const publicId of publicIds) {
      const rows: readonly ReservaDatabaseRow[] = (await queryRunner.query(
        `
            SELECT
              r.id,
              r.id_cliente
            FROM reserva r

            LEFT JOIN venta_reserva vr
              ON vr.id_reserva = r.id

            WHERE
              r.public_id = ?
              AND r.deleted_at IS NULL
              AND vr.id_reserva IS NULL

            LIMIT 1
          `,
        [publicId],
      )) as readonly ReservaDatabaseRow[];

      const reserva: ReservaDatabaseRow | undefined = rows[0];

      if (reserva === undefined) {
        throw new Error('Una de las reservas asociadas a la venta ya no está disponible.');
      }

      if (reserva.id_cliente !== idCliente) {
        throw new Error(
          'Todas las reservas de una venta deben pertenecer al cliente seleccionado.',
        );
      }

      reservas.set(publicId, reserva);
    }

    return reservas;
  }

  private async resolveTiposPago(
    queryRunner: QueryRunner,
    command: GuardarVentaRecordCommand,
  ): Promise<ReadonlyMap<string, TipoPagoDatabaseRow>> {
    const tiposPago: Map<string, TipoPagoDatabaseRow> = new Map<string, TipoPagoDatabaseRow>();

    for (const pago of command.pagos) {
      const rows: readonly TipoPagoDatabaseRow[] = (await queryRunner.query(
        `
            SELECT
              id,
              slug,
              afecta_caja,
              fisico
            FROM tipo_pago
            WHERE
              public_id = ?
              AND activo = 1
              AND deleted_at IS NULL
            LIMIT 1
          `,
        [pago.tipoPagoPublicId],
      )) as readonly TipoPagoDatabaseRow[];

      const tipoPago: TipoPagoDatabaseRow | undefined = rows[0];

      if (tipoPago === undefined || tipoPago.fisico !== 1) {
        throw new Error('Uno de los tipos de pago seleccionados ya no está disponible.');
      }

      this.validatePagoAgainstTipoPago(command.totalCents, pago, tipoPago);

      tiposPago.set(pago.tipoPagoPublicId, tipoPago);
    }

    return tiposPago;
  }

  private validatePagoAgainstTipoPago(
    totalCents: number,
    pago: GuardarVentaPagoRecordCommand,
    tipoPago: TipoPagoDatabaseRow,
  ): void {
    const esEfectivo: boolean = tipoPago.slug.toLocaleLowerCase() === EFECTIVO_SLUG;

    if (!esEfectivo) {
      if (pago.entregadoCents !== null || pago.cambioCents !== 0) {
        throw new Error('Solo un pago en efectivo puede contener importe entregado o cambio.');
      }

      return;
    }

    if (totalCents > 0) {
      if (pago.entregadoCents === null) {
        throw new Error('Un pago positivo en efectivo debe indicar el importe entregado.');
      }

      return;
    }

    if (pago.entregadoCents !== null || pago.cambioCents !== 0) {
      throw new Error('Un reembolso en efectivo no puede contener importe entregado ni cambio.');
    }
  }

  private async nextVentaNumber(queryRunner: QueryRunner, timestamp: string): Promise<number> {
    /*
     * La secuencia se sincroniza con el máximo histórico
     * antes de incrementarse.
     *
     * Esto permite que una importación legacy pueda haber
     * creado ventas numeradas sin haber inicializado
     * previamente secuencia_documento.
     */
    await queryRunner.query(
      `
        INSERT INTO secuencia_documento (
          tipo,
          serie,
          ultimo_numero,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, 0, ?, ?
        )
        ON CONFLICT (
          tipo,
          serie
        )
        DO NOTHING
      `,
      [VENTA_DOCUMENT_TYPE, VENTA_SERIE, timestamp, timestamp],
    );

    await queryRunner.query(
      `
        UPDATE secuencia_documento
        SET
          ultimo_numero = MAX(
            ultimo_numero,
            (
              SELECT
                COALESCE(
                  MAX(numero),
                  0
                )
              FROM venta
              WHERE serie = ?
            )
          ) + 1,
          updated_at = ?
        WHERE
          tipo = ?
          AND serie = ?
      `,
      [VENTA_SERIE, timestamp, VENTA_DOCUMENT_TYPE, VENTA_SERIE],
    );

    const rows: readonly SecuenciaDatabaseRow[] = (await queryRunner.query(
      `
          SELECT
            ultimo_numero
          FROM secuencia_documento
          WHERE
            tipo = ?
            AND serie = ?
          LIMIT 1
        `,
      [VENTA_DOCUMENT_TYPE, VENTA_SERIE],
    )) as readonly SecuenciaDatabaseRow[];

    const numero: number | undefined = rows[0]?.ultimo_numero;

    if (numero === undefined || !Number.isSafeInteger(numero) || numero <= 0) {
      throw new Error('No se ha podido obtener el siguiente número de venta.');
    }

    return numero;
  }

  private async insertVenta(
    queryRunner: QueryRunner,
    command: GuardarVentaRecordCommand,
    idCaja: number,
    idEmpleado: number,
    idCliente: number | null,
    idVentaOrigenDevolucion: number | null,
    numero: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO venta (
          public_id,
          id_caja,
          id_empleado,
          id_cliente,
          id_venta_origen_devolucion,
          serie,
          numero,
          total_cents,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `,
      [
        command.publicId,
        idCaja,
        idEmpleado,
        idCliente,
        idVentaOrigenDevolucion,
        VENTA_SERIE,
        numero,
        command.totalCents,
        timestamp,
        timestamp,
      ],
    );
  }

  private async insertReservasOrigen(
    queryRunner: QueryRunner,
    idVenta: number,
    reservas: ReadonlyMap<string, ReservaDatabaseRow>,
    timestamp: string,
  ): Promise<void> {
    for (const reserva of reservas.values()) {
      await queryRunner.query(
        `
          INSERT INTO venta_reserva (
            id_venta,
            id_reserva,
            created_at
          )
          VALUES (
            ?, ?, ?
          )
        `,
        [idVenta, reserva.id, timestamp],
      );
    }
  }

  private async insertLinea(
    queryRunner: QueryRunner,
    idVenta: number,
    idVentaOrigenDevolucion: number | null,
    reservas: ReadonlyMap<string, ReservaDatabaseRow>,
    linea: GuardarVentaLineaRecordCommand,
    timestamp: string,
  ): Promise<void> {
    const origen: {
      readonly idArticulo: number | null;
      readonly idLineaVentaOrigen: number | null;
      readonly idLineaReservaOrigen: number | null;
    } = await this.resolveLineaOrigen(queryRunner, idVentaOrigenDevolucion, reservas, linea);

    await queryRunner.query(
      `
        INSERT INTO linea_venta (
          public_id,
          id_venta,
          id_articulo,
          id_linea_venta_origen_devolucion,
          id_linea_reserva_origen,
          nombre_articulo,
          puc_micros,
          pvp_micros,
          iva_bps,
          importe_micros,
          descuento_bps,
          importe_descuento_micros,
          unidades,
          unidades_devueltas,
          regalo,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?
        )
      `,
      [
        randomUUID(),
        idVenta,
        origen.idArticulo,
        origen.idLineaVentaOrigen,
        origen.idLineaReservaOrigen,
        linea.nombre,
        linea.pucMicros,
        linea.pvpMicros,
        linea.ivaBps,
        linea.importeMicros,
        linea.descuentoBps,
        linea.importeDescuentoMicros,
        linea.unidades,
        linea.regalo ? 1 : 0,
        timestamp,
        timestamp,
      ],
    );
  }

  private async resolveLineaOrigen(
    queryRunner: QueryRunner,
    idVentaOrigenDevolucion: number | null,
    reservas: ReadonlyMap<string, ReservaDatabaseRow>,
    linea: GuardarVentaLineaRecordCommand,
  ): Promise<{
    readonly idArticulo: number | null;
    readonly idLineaVentaOrigen: number | null;
    readonly idLineaReservaOrigen: number | null;
  }> {
    if (linea.devolucionLineaOrigenPublicId !== null) {
      if (idVentaOrigenDevolucion === null) {
        throw new Error('Una línea de devolución no tiene una venta de origen válida.');
      }

      const rows: readonly LineaVentaOrigenDatabaseRow[] = (await queryRunner.query(
        `
            SELECT
              id,
              id_articulo
            FROM linea_venta
            WHERE
              public_id = ?
              AND id_venta = ?
              AND unidades > 0
            LIMIT 1
          `,
        [linea.devolucionLineaOrigenPublicId, idVentaOrigenDevolucion],
      )) as readonly LineaVentaOrigenDatabaseRow[];

      const origen: LineaVentaOrigenDatabaseRow | undefined = rows[0];

      if (origen === undefined) {
        throw new Error('Una de las líneas origen de devolución ya no está disponible.');
      }

      return {
        idArticulo: origen.id_articulo,
        idLineaVentaOrigen: origen.id,
        idLineaReservaOrigen: null,
      };
    }

    if (linea.reservaLineaOrigenPublicId !== null) {
      const rows: readonly LineaReservaOrigenDatabaseRow[] = (await queryRunner.query(
        `
            SELECT
              lr.id,
              lr.id_reserva,
              lr.id_articulo
            FROM linea_reserva lr

            INNER JOIN reserva r
              ON r.id = lr.id_reserva

            WHERE
              lr.public_id = ?
              AND r.deleted_at IS NULL
            LIMIT 1
          `,
        [linea.reservaLineaOrigenPublicId],
      )) as readonly LineaReservaOrigenDatabaseRow[];

      const origen: LineaReservaOrigenDatabaseRow | undefined = rows[0];

      if (origen === undefined) {
        throw new Error('Una de las líneas origen de reserva ya no está disponible.');
      }

      const reservaIds: Set<number> = new Set<number>(
        Array.from(reservas.values(), (reserva: ReservaDatabaseRow): number => reserva.id),
      );

      if (!reservaIds.has(origen.id_reserva)) {
        throw new Error('Una línea de reserva no pertenece a las reservas indicadas por la venta.');
      }

      return {
        idArticulo: origen.id_articulo,
        idLineaVentaOrigen: null,
        idLineaReservaOrigen: origen.id,
      };
    }

    const idArticulo: number | null = await this.resolveArticuloId(
      queryRunner,
      linea.articuloPublicId,
    );

    return {
      idArticulo,
      idLineaVentaOrigen: null,
      idLineaReservaOrigen: null,
    };
  }

  private async resolveArticuloId(
    queryRunner: QueryRunner,
    publicId: string | null,
  ): Promise<number | null> {
    if (publicId === null) {
      return null;
    }

    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT
            id
          FROM articulo
          WHERE
            public_id = ?
            AND deleted_at IS NULL
          LIMIT 1
        `,
      [publicId],
    )) as readonly DatabaseIdRow[];

    return this.requireDatabaseId(
      rows[0]?.id,
      'Uno de los artículos de la venta ya no está disponible.',
    );
  }

  private async reconcileStockAndOrigins(
    queryRunner: QueryRunner,
    idVenta: number,
    idVentaOrigenDevolucion: number | null,
    reservas: ReadonlyMap<string, ReservaDatabaseRow>,
    command: GuardarVentaRecordCommand,
    timestamp: string,
  ): Promise<void> {
    for (const linea of command.lineas) {
      /*
       * Las líneas procedentes de reserva se procesan
       * conjuntamente después, porque necesitamos comparar
       * toda la reserva original con su resultado final.
       */
      if (linea.reservaLineaOrigenPublicId !== null) {
        continue;
      }

      if (linea.devolucionLineaOrigenPublicId !== null) {
        await this.processDevolucionStock(
          queryRunner,
          idVenta,
          idVentaOrigenDevolucion,
          linea,
          timestamp,
        );

        continue;
      }

      const idArticulo: number | null = await this.resolveArticuloId(
        queryRunner,
        linea.articuloPublicId,
      );

      if (idArticulo === null) {
        continue;
      }

      await this.applyStockMovement(
        queryRunner,
        idArticulo,
        linea.unidades,
        idVenta,
        linea.pucMicros,
        linea.pvpMicros,
        timestamp,
      );
    }

    await this.consumeReservas(queryRunner, idVenta, reservas, command.lineas, timestamp);
  }

  /**
   * Aplica una devolución sobre la línea histórica exacta.
   *
   * unidades_devueltas se acumula, nunca se sustituye.
   */
  private async processDevolucionStock(
    queryRunner: QueryRunner,
    idVenta: number,
    idVentaOrigenDevolucion: number | null,
    linea: GuardarVentaLineaRecordCommand,
    timestamp: string,
  ): Promise<void> {
    if (idVentaOrigenDevolucion === null || linea.devolucionLineaOrigenPublicId === null) {
      throw new Error('Una línea de devolución no tiene un origen válido.');
    }

    const rows: readonly LineaVentaDevolucionStockDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          id,
          id_articulo,
          unidades,
          unidades_devueltas,
          puc_micros,
          pvp_micros
        FROM linea_venta
        WHERE
          public_id = ?
          AND id_venta = ?
          AND unidades > 0
        LIMIT 1
      `,
      [linea.devolucionLineaOrigenPublicId, idVentaOrigenDevolucion],
    )) as readonly LineaVentaDevolucionStockDatabaseRow[];

    const origen: LineaVentaDevolucionStockDatabaseRow | undefined = rows[0];

    if (origen === undefined) {
      throw new Error('Una de las líneas origen de devolución ya no está disponible.');
    }

    if (
      !Number.isSafeInteger(origen.unidades) ||
      origen.unidades <= 0 ||
      !Number.isSafeInteger(origen.unidades_devueltas) ||
      origen.unidades_devueltas < 0
    ) {
      throw new Error('La línea origen de devolución contiene unas unidades no válidas.');
    }

    const unidadesDevueltasAhora: number = -linea.unidades;

    const unidadesDevueltasTotal: number = this.safeAdd(
      origen.unidades_devueltas,
      unidadesDevueltasAhora,
      'El total de unidades devueltas supera el rango numérico seguro.',
    );

    if (unidadesDevueltasTotal > origen.unidades) {
      throw new Error('La devolución supera las unidades disponibles de la línea original.');
    }

    await queryRunner.query(
      `
      UPDATE linea_venta
      SET
        unidades_devueltas = ?,
        updated_at = ?
      WHERE id = ?
    `,
      [unidadesDevueltasTotal, timestamp, origen.id],
    );

    if (origen.id_articulo === null) {
      return;
    }

    /*
     * linea.unidades es negativa:
     *
     * diferencia = -2
     * stockFinal = stockPrevio - (-2)
     *            = stockPrevio + 2
     */
    await this.applyStockMovement(
      queryRunner,
      origen.id_articulo,
      linea.unidades,
      idVenta,
      origen.puc_micros,
      origen.pvp_micros,
      timestamp,
    );
  }

  /**
   * Resuelve conjuntamente todas las reservas originales.
   *
   * Una línea reservada que ya no aparezca en la venta
   * equivale a cero unidades finalmente vendidas.
   */
  private async consumeReservas(
    queryRunner: QueryRunner,
    idVenta: number,
    reservas: ReadonlyMap<string, ReservaDatabaseRow>,
    lineasVenta: readonly GuardarVentaLineaRecordCommand[],
    timestamp: string,
  ): Promise<void> {
    if (reservas.size === 0) {
      return;
    }

    const lineasFinales: Map<string, GuardarVentaLineaRecordCommand> = new Map<
      string,
      GuardarVentaLineaRecordCommand
    >();

    for (const linea of lineasVenta) {
      if (linea.reservaLineaOrigenPublicId === null) {
        continue;
      }

      lineasFinales.set(linea.reservaLineaOrigenPublicId, linea);
    }

    for (const reserva of reservas.values()) {
      const lineasReserva: readonly LineaReservaStockDatabaseRow[] = (await queryRunner.query(
        `
          SELECT
            id,
            public_id,
            id_reserva,
            id_articulo,
            puc_micros,
            pvp_cents,
            unidades
          FROM linea_reserva
          WHERE id_reserva = ?
          ORDER BY id
        `,
        [reserva.id],
      )) as readonly LineaReservaStockDatabaseRow[];

      if (lineasReserva.length === 0) {
        throw new Error('Una de las reservas asociadas a la venta no contiene líneas.');
      }

      for (const lineaReserva of lineasReserva) {
        if (!Number.isSafeInteger(lineaReserva.unidades) || lineaReserva.unidades <= 0) {
          throw new Error('Una línea de reserva contiene unas unidades no válidas.');
        }

        const lineaFinal: GuardarVentaLineaRecordCommand | undefined = lineasFinales.get(
          lineaReserva.public_id,
        );

        const unidadesFinales: number = lineaFinal?.unidades ?? 0;

        const diferencia: number = this.safeSubtract(
          unidadesFinales,
          lineaReserva.unidades,
          'La reconciliación de una reserva supera el rango numérico seguro.',
        );

        if (lineaReserva.id_articulo !== null) {
          await this.applyStockMovement(
            queryRunner,
            lineaReserva.id_articulo,
            diferencia,
            idVenta,
            lineaReserva.puc_micros,
            this.centsToMicros(lineaReserva.pvp_cents),
            timestamp,
          );
        }

        if (lineaFinal !== undefined) {
          lineasFinales.delete(lineaReserva.public_id);
        }
      }

      /*
       * La reserva queda resuelta por esta venta.
       *
       * Conservamos sus líneas como histórico y realizamos
       * únicamente borrado lógico de la cabecera.
       */
      await queryRunner.query(
        `
        UPDATE reserva
        SET
          deleted_at = ?,
          updated_at = ?
        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
        [timestamp, timestamp, reserva.id],
      );
    }

    if (lineasFinales.size !== 0) {
      throw new Error(
        'Una línea de reserva no pertenece a ninguna de las reservas asociadas a la venta.',
      );
    }
  }

  /**
   * Aplica un movimiento utilizando siempre la convención:
   *
   * stockFinal = stockPrevio - diferencia
   */
  private async applyStockMovement(
    queryRunner: QueryRunner,
    idArticulo: number,
    diferencia: number,
    idVenta: number,
    pucMicros: number,
    pvpMicros: number,
    timestamp: string,
  ): Promise<void> {
    const rows: readonly ArticuloStockDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          stock
        FROM articulo
        WHERE id = ?
        LIMIT 1
      `,
      [idArticulo],
    )) as readonly ArticuloStockDatabaseRow[];

    const stockPrevio: number | undefined = rows[0]?.stock;

    if (stockPrevio === undefined || !Number.isSafeInteger(stockPrevio)) {
      throw new Error('No se ha podido obtener el stock actual de uno de los artículos.');
    }

    if (!Number.isSafeInteger(diferencia)) {
      throw new Error('El movimiento de stock de una línea no es válido.');
    }

    const stockFinal: number = this.safeSubtract(
      stockPrevio,
      diferencia,
      'El nuevo stock del artículo supera el rango numérico seguro.',
    );

    await queryRunner.query(
      `
      UPDATE articulo
      SET
        stock = ?,
        updated_at = ?
      WHERE id = ?
    `,
      [stockFinal, timestamp, idArticulo],
    );

    await this.insertHistoricoArticulo(
      queryRunner,
      idArticulo,
      diferencia,
      stockPrevio,
      stockFinal,
      idVenta,
      pucMicros,
      pvpMicros,
      timestamp,
    );
  }

  private async insertHistoricoArticulo(
    queryRunner: QueryRunner,
    idArticulo: number,
    diferencia: number,
    stockPrevio: number,
    stockFinal: number,
    idVenta: number,
    pucMicros: number,
    pvpMicros: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO historico_articulo (
        public_id,
        id_articulo,
        tipo,
        stock_previo,
        diferencia,
        stock_final,
        id_venta,
        id_pedido,
        id_merma_caducidad,
        puc_micros,
        pvp_micros,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?
      )
    `,
      [
        randomUUID(),
        idArticulo,
        HISTORICO_ARTICULO_TIPO_VENTA,
        stockPrevio,
        diferencia,
        stockFinal,
        idVenta,
        pucMicros,
        pvpMicros,
        timestamp,
        timestamp,
      ],
    );
  }

  private async updateCajaAcumulados(
    queryRunner: QueryRunner,
    idCaja: number,
    command: GuardarVentaRecordCommand,
    tiposPago: ReadonlyMap<string, TipoPagoDatabaseRow>,
    timestamp: string,
  ): Promise<void> {
    const summary: VentaCajaSummary = this.calculateVentaCajaSummary(command, tiposPago);

    const rows: readonly CajaAcumuladosDatabaseRow[] = (await queryRunner.query(
      `
        SELECT
          ventas_cents,
          beneficios_cents,
          descuentos_cents,
          importe_cierre_teorico_cents
        FROM caja
        WHERE
          id = ?
          AND cierre IS NULL
        LIMIT 1
      `,
      [idCaja],
    )) as readonly CajaAcumuladosDatabaseRow[];

    const caja: CajaAcumuladosDatabaseRow | undefined = rows[0];

    if (caja === undefined) {
      throw new Error('La caja asociada a la venta ya no está abierta.');
    }

    const ventasCents: number = this.safeAdd(
      caja.ventas_cents,
      command.totalCents,
      'El acumulado de ventas de la caja supera el rango numérico seguro.',
    );

    const beneficiosCents: number = this.safeAdd(
      caja.beneficios_cents,
      summary.beneficioCents,
      'El acumulado de beneficios de la caja supera el rango numérico seguro.',
    );

    const descuentosCents: number = this.safeAdd(
      caja.descuentos_cents,
      summary.descuentoCents,
      'El acumulado de descuentos de la caja supera el rango numérico seguro.',
    );

    const cierreTeoricoCents: number = this.safeAdd(
      caja.importe_cierre_teorico_cents,
      summary.cierreTeoricoImpactCents,
      'El importe teórico de la caja supera el rango numérico seguro.',
    );

    await queryRunner.query(
      `
      UPDATE caja
      SET
        ventas_cents = ?,
        beneficios_cents = ?,
        descuentos_cents = ?,
        importe_cierre_teorico_cents = ?,
        updated_at = ?
      WHERE
        id = ?
        AND cierre IS NULL
    `,
      [ventasCents, beneficiosCents, descuentosCents, cierreTeoricoCents, timestamp, idCaja],
    );

    const descuentoPagosCents: readonly number[] = this.allocateDiscountByPayments(
      summary.descuentoCents,
      command.pagos,
    );

    for (let index: number = 0; index < command.pagos.length; index += 1) {
      const pago: GuardarVentaPagoRecordCommand | undefined = command.pagos[index];

      const descuentoCents: number | undefined = descuentoPagosCents[index];

      if (pago === undefined || descuentoCents === undefined) {
        throw new Error('No se ha podido actualizar uno de los acumulados de pago de la caja.');
      }

      const tipoPago: TipoPagoDatabaseRow | undefined = tiposPago.get(pago.tipoPagoPublicId);

      if (tipoPago === undefined) {
        throw new Error('No se ha podido resolver uno de los tipos de pago de la caja.');
      }

      await this.updateCajaTipo(
        queryRunner,
        idCaja,
        tipoPago.id,
        pago.importeCents,
        descuentoCents,
        timestamp,
      );
    }
  }

  private calculateVentaCajaSummary(
    command: GuardarVentaRecordCommand,
    tiposPago: ReadonlyMap<string, TipoPagoDatabaseRow>,
  ): VentaCajaSummary {
    let beneficioMicros: number = 0;
    let descuentoMicros: number = 0;

    for (const linea of command.lineas) {
      const costeMicros: number = this.safeMultiply(
        linea.pucMicros,
        linea.unidades,
        'El coste de una línea supera el rango numérico seguro.',
      );

      const beneficioLineaMicros: number = this.safeSubtract(
        linea.importeMicros,
        costeMicros,
        'El beneficio de una línea supera el rango numérico seguro.',
      );

      beneficioMicros = this.safeAdd(
        beneficioMicros,
        beneficioLineaMicros,
        'El beneficio total de la venta supera el rango numérico seguro.',
      );

      descuentoMicros = this.safeAdd(
        descuentoMicros,
        this.calculateLineaDescuentoMicros(linea),
        'El descuento total de la venta supera el rango numérico seguro.',
      );
    }

    let cierreTeoricoImpactCents: number = 0;

    for (const pago of command.pagos) {
      const tipoPago: TipoPagoDatabaseRow | undefined = tiposPago.get(pago.tipoPagoPublicId);

      if (tipoPago === undefined) {
        throw new Error('No se ha podido resolver uno de los tipos de pago de la venta.');
      }

      if (tipoPago.afecta_caja === 1) {
        cierreTeoricoImpactCents = this.safeAdd(
          cierreTeoricoImpactCents,
          pago.importeCents,
          'El impacto de los pagos sobre la caja supera el rango numérico seguro.',
        );
      }
    }

    return {
      beneficioCents: this.microsToCents(beneficioMicros),
      descuentoCents: this.microsToCents(descuentoMicros),
      cierreTeoricoImpactCents,
    };
  }

  private calculateLineaDescuentoMicros(linea: GuardarVentaLineaRecordCommand): number {
    if (linea.importeDescuentoMicros !== 0) {
      return linea.unidades < 0 ? -linea.importeDescuentoMicros : linea.importeDescuentoMicros;
    }

    if (linea.descuentoBps === 0) {
      return 0;
    }

    const importeBaseMicros: number = this.safeMultiply(
      linea.pvpMicros,
      linea.unidades,
      'El importe base de una línea supera el rango numérico seguro.',
    );

    const descuentoMicros: number = this.safeSubtract(
      importeBaseMicros,
      linea.importeMicros,
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

  private async updateCajaTipo(
    queryRunner: QueryRunner,
    idCaja: number,
    idTipoPago: number,
    importeCents: number,
    descuentoCents: number,
    timestamp: string,
  ): Promise<void> {
    const rows: readonly CajaTipoAcumuladosDatabaseRow[] = (await queryRunner.query(
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
    )) as readonly CajaTipoAcumuladosDatabaseRow[];

    const cajaTipo: CajaTipoAcumuladosDatabaseRow | undefined = rows[0];

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
      'El número de operaciones del tipo de pago supera el rango numérico seguro.',
    );

    const importeTotalCents: number = this.safeAdd(
      cajaTipo.importe_total_cents,
      importeCents,
      'El acumulado del tipo de pago supera el rango numérico seguro.',
    );

    const importeDescuentoCents: number = this.safeAdd(
      cajaTipo.importe_descuento_cents,
      descuentoCents,
      'El descuento acumulado del tipo de pago supera el rango numérico seguro.',
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

  private allocateDiscountByPayments(
    descuentoTotalCents: number,
    pagos: readonly GuardarVentaPagoRecordCommand[],
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
        Math.abs(pago.importeCents),
        'El total utilizado para repartir el descuento supera el rango numérico seguro.',
      );
    }

    if (totalWeight === 0) {
      throw new Error('No se puede repartir el descuento entre pagos sin importe.');
    }

    const descuentoSign: number = descuentoTotalCents < 0 ? -1 : 1;

    const descuentoAbsCents: number = Math.abs(descuentoTotalCents);

    let allocatedCents: number = 0;

    return pagos.map((pago: GuardarVentaPagoRecordCommand, index: number): number => {
      if (index === pagos.length - 1) {
        return this.safeSubtract(
          descuentoTotalCents,
          allocatedCents,
          'El reparto final del descuento supera el rango numérico seguro.',
        );
      }

      const allocationAbsCents: number = this.roundProportionalInteger(
        descuentoAbsCents,
        Math.abs(pago.importeCents),
        totalWeight,
      );

      const allocationCents: number = descuentoSign * allocationAbsCents;

      allocatedCents = this.safeAdd(
        allocatedCents,
        allocationCents,
        'El reparto del descuento supera el rango numérico seguro.',
      );

      return allocationCents;
    });
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

  private safeMultiply(left: number, right: number, message: string): number {
    const result: number = left * right;

    if (!Number.isSafeInteger(result)) {
      throw new Error(message);
    }

    return result;
  }

  private centsToMicros(cents: number): number {
    if (!Number.isSafeInteger(cents)) {
      throw new Error('Un precio histórico de reserva no es válido.');
    }

    const micros: number = cents * MICROS_PER_CENT;

    if (!Number.isSafeInteger(micros)) {
      throw new Error('Un precio histórico de reserva supera el rango numérico seguro.');
    }

    return micros;
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

  private async insertPago(
    queryRunner: QueryRunner,
    idVenta: number,
    idTipoPago: number,
    orden: number,
    pago: GuardarVentaPagoRecordCommand,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO venta_pago (
          public_id,
          id_venta,
          id_tipo_pago,
          orden,
          importe_cents,
          entregado_cents,
          cambio_cents,
          saldo_resultante_cents,
          referencia,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?
        )
      `,
      [
        randomUUID(),
        idVenta,
        idTipoPago,
        orden,
        pago.importeCents,
        pago.entregadoCents,
        pago.cambioCents,
        timestamp,
        timestamp,
      ],
    );
  }

  private requireDatabaseId(value: number | undefined, message: string): number {
    if (value === undefined || !Number.isSafeInteger(value) || value <= 0) {
      throw new Error(message);
    }

    return value;
  }
}
