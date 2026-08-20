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
