import type {
  InitializeVentaTicketBaiPendingRecordCommand,
  MarkVentaTicketBaiAcceptedRecordCommand,
  MarkVentaTicketBaiAttemptAcknowledgedRecordCommand,
  MarkVentaTicketBaiFailureRecordCommand,
  MarkVentaTicketBaiReconciledRejectedRecordCommand,
  MarkVentaTicketBaiRemotePendingRecordCommand,
} from '@backend/contracts/ventas/venta-ticket-bai-record-command.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type {
  VentaTicketBaiEstado,
  VentaTicketBaiRecord,
} from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import type { DataSource, QueryRunner } from 'typeorm';

const MAXIMUM_SAFE_INTEGER: number = Number.MAX_SAFE_INTEGER;

const FIND_BY_VENTA_ID_SQL: string = `
  SELECT
    id_venta,
    entorno,
    nif_emisor,
    serie,
    numero,
    estado,
    identificador,
    huella,
    qr,
    url,
    intentos,
    ultimo_error,
    solicitud_payload,
    respuesta_payload,
    enviado_at,
    aceptado_at,
    created_at,
    updated_at
  FROM venta_ticketbai
  WHERE id_venta = ?
  LIMIT 1
`;

interface VentaTicketBaiDatabaseRow {
  readonly id_venta: number;

  readonly entorno: TicketBaiEnvironment | null;

  readonly nif_emisor: string | null;
  readonly serie: string | null;
  readonly numero: string | null;

  readonly estado: VentaTicketBaiEstado;

  readonly identificador: string | null;
  readonly huella: string | null;
  readonly qr: string | null;
  readonly url: string | null;

  readonly intentos: number;
  readonly ultimo_error: string | null;

  readonly solicitud_payload: string | null;
  readonly respuesta_payload: string | null;

  readonly enviado_at: string | null;
  readonly aceptado_at: string | null;

  readonly created_at: string;
  readonly updated_at: string;
}

interface ChangesDatabaseRow {
  readonly total: number;
}

export default class TypeOrmVentasTicketBaiRepository implements VentasTicketBaiRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Recupera el estado TicketBAI de una venta.
   */
  async findByVentaId(idVenta: number): Promise<VentaTicketBaiRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly VentaTicketBaiDatabaseRow[] = (await dataSource.query(
      FIND_BY_VENTA_ID_SQL,
      [idVenta],
    )) as readonly VentaTicketBaiDatabaseRow[];

    const row: VentaTicketBaiDatabaseRow | undefined = rows[0];

    return row === undefined ? null : this.mapRecord(row);
  }

  /**
   * Crea idempotentemente un estado no_aplica
   * sin sobrescribir una decisión fiscal existente.
   */
  async initializeNoAplica(idVenta: number): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
            INSERT INTO venta_ticketbai (
              id_venta,
              entorno,
              nif_emisor,
              serie,
              numero,
              estado,
              intentos,
              created_at,
              updated_at
            )
            VALUES (
              ?,
              NULL,
              NULL,
              NULL,
              NULL,
              'no_aplica',
              0,
              ?,
              ?
            )
            ON CONFLICT (
              id_venta
            )
            DO NOTHING
          `,
          [idVenta, timestamp, timestamp],
        );

        return this.requireByVentaId(queryRunner, idVenta);
      },
    );
  }

  /**
   * Crea idempotentemente el estado pendiente
   * y congela su identidad y payload fiscales.
   */
  async initializePending(
    command: InitializeVentaTicketBaiPendingRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
            INSERT INTO venta_ticketbai (
              id_venta,
              entorno,
              nif_emisor,
              serie,
              numero,
              estado,
              intentos,
              solicitud_payload,
              created_at,
              updated_at
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              'pendiente',
              0,
              ?,
              ?,
              ?
            )
            ON CONFLICT (
              id_venta
            )
            DO NOTHING
          `,
          [
            command.idVenta,
            command.entorno,
            command.nifEmisor,
            command.serie,
            command.numero,
            command.solicitudPayload,
            timestamp,
            timestamp,
          ],
        );

        const record: VentaTicketBaiRecord = await this.requireByVentaId(
          queryRunner,
          command.idVenta,
        );

        this.assertCompatibleIdentity(record, command);

        return record;
      },
    );
  }

  /**
   * Cambia atómicamente pendiente → enviando
   * y contabiliza el primer intento.
   */
  async beginInitialAttempt(idVenta: number): Promise<VentaTicketBaiRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord | null> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
            UPDATE venta_ticketbai
            SET
              estado = 'enviando',
              intentos = intentos + 1,
              ultimo_error = NULL,
              respuesta_payload = NULL,
              enviado_at = ?,
              updated_at = ?
            WHERE
              id_venta = ?
              AND estado = 'pendiente'
          `,
          [timestamp, timestamp, idVenta],
        );

        if ((await this.getChanges(queryRunner)) !== 1) {
          return null;
        }

        return this.requireByVentaId(queryRunner, idVenta);
      },
    );
  }

  /**
   * Cambia atómicamente rechazada → enviando
   * y contabiliza un nuevo intento manual.
   */
  async beginManualAttempt(idVenta: number): Promise<VentaTicketBaiRecord | null> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord | null> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
            UPDATE venta_ticketbai
            SET
              estado = 'enviando',
              intentos = intentos + 1,
              ultimo_error = NULL,
              respuesta_payload = NULL,
              enviado_at = ?,
              updated_at = ?
            WHERE
              id_venta = ?
              AND estado = 'rechazada'
          `,
          [timestamp, timestamp, idVenta],
        );

        if ((await this.getChanges(queryRunner)) !== 1) {
          return null;
        }

        return this.requireByVentaId(queryRunner, idVenta);
      },
    );
  }

  /**
   * Conserva la respuesta técnica de un reenvío
   * que todavía debe reconciliarse remotamente.
   */
  async markAttemptAcknowledged(
    command: MarkVentaTicketBaiAttemptAcknowledgedRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
          UPDATE venta_ticketbai
          SET
            respuesta_payload = ?,
            updated_at = ?
          WHERE
            id_venta = ?
            AND estado = 'enviando'
        `,
          [command.respuestaPayload, timestamp, command.idVenta],
        );

        const updatedRows: number = await this.getChanges(queryRunner);

        if (updatedRows === 0) {
          const current: VentaTicketBaiRecord = await this.requireByVentaId(
            queryRunner,
            command.idVenta,
          );

          if (
            current.estado === 'enviando' &&
            current.respuestaPayload === command.respuestaPayload
          ) {
            return current;
          }

          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para confirmar el reenvío TicketBAI.',
            ].join(' '),
          );
        }

        return this.requireByVentaId(queryRunner, command.idVenta);
      },
    );
  }

  /**
   * Persiste un PENDING remoto que ya contiene
   * huella, QR y URL fiscales.
   *
   * La revisión documental solo cambia cuando
   * aparece o cambia el artefacto fiscal.
   */
  async markRemotePending(
    command: MarkVentaTicketBaiRemotePendingRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();
        const current: VentaTicketBaiRecord = await this.requireByVentaId(
          queryRunner,
          command.idVenta,
        );

        if (
          current.estado !== 'enviando' &&
          current.estado !== 'pendiente_remoto' &&
          current.estado !== 'error_temporal'
        ) {
          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para registrar TicketBAI pendiente.',
            ].join(' '),
          );
        }

        const fiscalArtifactChanged: boolean = !this.hasSameFiscalArtifact(current, command);

        await queryRunner.query(
          `
        UPDATE venta_ticketbai
        SET
          estado = 'pendiente_remoto',
          huella = ?,
          qr = ?,
          url = ?,
          ultimo_error = NULL,
          respuesta_payload = ?,
          updated_at = ?
        WHERE
          id_venta = ?
          AND estado IN (
            'enviando',
            'pendiente_remoto',
            'error_temporal'
          )
        `,
          [
            command.huella,
            command.qr,
            command.url,
            command.respuestaPayload,
            timestamp,
            command.idVenta,
          ],
        );

        if ((await this.getChanges(queryRunner)) !== 1) {
          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para registrar TicketBAI pendiente.',
            ].join(' '),
          );
        }

        if (fiscalArtifactChanged) {
          await this.incrementTicketRevision(queryRunner, command.idVenta, timestamp);
        }

        return this.requireByVentaId(queryRunner, command.idVenta);
      },
    );
  }

  /**
   * Confirma una aceptación remota y actualiza la
   * revisión documental solo si cambia el artefacto fiscal.
   */
  async markAccepted(
    command: MarkVentaTicketBaiAcceptedRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();
        const current: VentaTicketBaiRecord = await this.requireByVentaId(
          queryRunner,
          command.idVenta,
        );

        if (this.isSameAcceptedResult(current, command)) {
          return current;
        }

        if (
          current.estado !== 'enviando' &&
          current.estado !== 'pendiente_remoto' &&
          current.estado !== 'error_temporal'
        ) {
          throw new Error(
            ['La venta no se encuentra en un estado', 'válido para aceptar TicketBAI.'].join(' '),
          );
        }

        const fiscalArtifactChanged: boolean = !this.hasSameFiscalArtifact(current, command);

        await queryRunner.query(
          `
        UPDATE venta_ticketbai
        SET
          estado = 'aceptada',
          huella = ?,
          qr = ?,
          url = ?,
          ultimo_error = NULL,
          respuesta_payload = ?,
          aceptado_at = ?,
          updated_at = ?
        WHERE
          id_venta = ?
          AND estado IN (
            'enviando',
            'pendiente_remoto',
            'error_temporal'
          )
        `,
          [
            command.huella,
            command.qr,
            command.url,
            command.respuestaPayload,
            timestamp,
            timestamp,
            command.idVenta,
          ],
        );

        const updatedRows: number = await this.getChanges(queryRunner);

        if (updatedRows === 0) {
          const latest: VentaTicketBaiRecord = await this.requireByVentaId(
            queryRunner,
            command.idVenta,
          );

          if (this.isSameAcceptedResult(latest, command)) {
            return latest;
          }

          throw new Error(
            ['La venta no se encuentra en un estado', 'válido para aceptar TicketBAI.'].join(' '),
          );
        }

        if (fiscalArtifactChanged) {
          await this.incrementTicketRevision(queryRunner, command.idVenta, timestamp);
        }

        return this.requireByVentaId(queryRunner, command.idVenta);
      },
    );
  }

  /**
   * Persiste un rechazo descubierto al reconciliar
   * una factura previamente pendiente o ambigua.
   */
  async markReconciledRejected(
    command: MarkVentaTicketBaiReconciledRejectedRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();
        const current: VentaTicketBaiRecord = await this.requireByVentaId(
          queryRunner,
          command.idVenta,
        );

        if (
          current.estado !== 'enviando' &&
          current.estado !== 'pendiente_remoto' &&
          current.estado !== 'error_temporal'
        ) {
          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para reconciliar un rechazo TicketBAI.',
            ].join(' '),
          );
        }

        const invalidatesFiscalDocument: boolean = current.estado === 'pendiente_remoto';

        await queryRunner.query(
          `
        UPDATE venta_ticketbai
        SET
          estado = 'rechazada',
          huella = ?,
          qr = ?,
          url = ?,
          ultimo_error = ?,
          respuesta_payload = ?,
          updated_at = ?
        WHERE
          id_venta = ?
          AND estado IN (
            'enviando',
            'pendiente_remoto',
            'error_temporal'
          )
        `,
          [
            command.huella,
            command.qr,
            command.url,
            command.ultimoError,
            command.respuestaPayload,
            timestamp,
            command.idVenta,
          ],
        );

        if ((await this.getChanges(queryRunner)) !== 1) {
          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para reconciliar un rechazo TicketBAI.',
            ].join(' '),
          );
        }

        if (invalidatesFiscalDocument) {
          await this.incrementTicketRevision(queryRunner, command.idVenta, timestamp);
        }

        return this.requireByVentaId(queryRunner, command.idVenta);
      },
    );
  }

  /**
   * Finaliza el intento actual con rechazo/error
   * sin modificar la revisión documental.
   */
  async markFailure(
    command: MarkVentaTicketBaiFailureRecordCommand,
  ): Promise<VentaTicketBaiRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<VentaTicketBaiRecord> => {
        const timestamp: string = new Date().toISOString();

        await queryRunner.query(
          `
            UPDATE venta_ticketbai
            SET
              estado = ?,
              ultimo_error = ?,
              respuesta_payload = ?,
              updated_at = ?
            WHERE
              id_venta = ?
              AND estado = 'enviando'
          `,
          [
            command.estado,
            command.ultimoError,
            command.respuestaPayload,
            timestamp,
            command.idVenta,
          ],
        );

        const updatedRows: number = await this.getChanges(queryRunner);

        if (updatedRows === 0) {
          const current: VentaTicketBaiRecord = await this.requireByVentaId(
            queryRunner,
            command.idVenta,
          );

          if (
            current.estado === command.estado &&
            current.ultimoError === command.ultimoError &&
            current.respuestaPayload === command.respuestaPayload
          ) {
            return current;
          }

          throw new Error(
            [
              'La venta no se encuentra en un estado',
              'válido para registrar el fallo TicketBAI.',
            ].join(' '),
          );
        }

        return this.requireByVentaId(queryRunner, command.idVenta);
      },
    );
  }

  /**
   * Recupera obligatoriamente el registro fiscal
   * usando la misma conexión transaccional.
   */
  private async requireByVentaId(
    queryRunner: QueryRunner,
    idVenta: number,
  ): Promise<VentaTicketBaiRecord> {
    const rows: readonly VentaTicketBaiDatabaseRow[] = (await queryRunner.query(
      FIND_BY_VENTA_ID_SQL,
      [idVenta],
    )) as readonly VentaTicketBaiDatabaseRow[];

    const row: VentaTicketBaiDatabaseRow | undefined = rows[0];

    if (row === undefined) {
      throw new Error('No se encuentra el estado TicketBAI de la venta.');
    }

    return this.mapRecord(row);
  }

  /**
   * Obtiene cuántas filas modificó la última
   * sentencia SQLite de esta misma conexión.
   */
  private async getChanges(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly ChangesDatabaseRow[] = (await queryRunner.query(
      `
            SELECT changes() AS total
          `,
    )) as readonly ChangesDatabaseRow[];

    const total: number | undefined = rows[0]?.total;

    if (total === undefined || !Number.isSafeInteger(total) || total < 0) {
      throw new Error('No se ha podido determinar el resultado de la actualización TicketBAI.');
    }

    return total;
  }

  /**
   * Invalida la revisión documental vigente después
   * de aparecer o cambiar el artefacto fiscal TicketBAI.
   */
  private async incrementTicketRevision(
    queryRunner: QueryRunner,
    idVenta: number,
    timestamp: string,
  ): Promise<void> {
    await queryRunner.query(
      `
    UPDATE venta
    SET
      ticket_revision = ticket_revision + 1,
      updated_at = ?
    WHERE
      id = ?
      AND deleted_at IS NULL
      AND ticket_revision < ?
    `,
      [timestamp, idVenta, MAXIMUM_SAFE_INTEGER],
    );

    if ((await this.getChanges(queryRunner)) !== 1) {
      throw new Error(
        [
          'No se ha podido actualizar la revisión',
          'documental después de actualizar TicketBAI.',
        ].join(' '),
      );
    }
  }

  /**
   * Impide que una repetición del flujo cambie
   * silenciosamente una identidad fiscal ya congelada.
   */
  private assertCompatibleIdentity(
    record: VentaTicketBaiRecord,
    command: InitializeVentaTicketBaiPendingRecordCommand,
  ): void {
    /*
     * no_aplica y legacy son decisiones históricas.
     * initializePending nunca las transforma.
     */
    if (record.estado === 'no_aplica' || record.estado === 'legacy') {
      return;
    }

    if (
      record.entorno !== command.entorno ||
      record.nifEmisor !== command.nifEmisor ||
      record.serie !== command.serie ||
      record.numero !== command.numero ||
      record.solicitudPayload !== command.solicitudPayload
    ) {
      throw new Error(
        [
          'La venta ya tiene una identidad TicketBAI',
          'distinta de la que se intenta utilizar.',
        ].join(' '),
      );
    }
  }

  /**
   * Comprueba si dos resultados representan exactamente
   * el mismo artefacto fiscal visible en los documentos.
   */
  private hasSameFiscalArtifact(
    record: VentaTicketBaiRecord,
    command: Pick<MarkVentaTicketBaiAcceptedRecordCommand, 'huella' | 'qr' | 'url'>,
  ): boolean {
    return (
      record.huella === command.huella && record.qr === command.qr && record.url === command.url
    );
  }

  /**
   * Comprueba si una aceptación repetida representa
   * exactamente el mismo resultado fiscal ya guardado.
   */
  private isSameAcceptedResult(
    record: VentaTicketBaiRecord,
    command: MarkVentaTicketBaiAcceptedRecordCommand,
  ): boolean {
    return (
      record.estado === 'aceptada' &&
      this.hasSameFiscalArtifact(record, command) &&
      record.respuestaPayload === command.respuestaPayload
    );
  }

  /**
   * Convierte una fila SQLite al record utilizado
   * por el backend.
   */
  private mapRecord(row: VentaTicketBaiDatabaseRow): VentaTicketBaiRecord {
    return {
      idVenta: row.id_venta,

      entorno: row.entorno,
      nifEmisor: row.nif_emisor,
      serie: row.serie,
      numero: row.numero,

      estado: row.estado,

      identificador: row.identificador,
      huella: row.huella,
      qr: row.qr,
      url: row.url,

      intentos: row.intentos,
      ultimoError: row.ultimo_error,

      solicitudPayload: row.solicitud_payload,

      respuestaPayload: row.respuesta_payload,

      enviadoAt: row.enviado_at,
      aceptadoAt: row.aceptado_at,

      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
