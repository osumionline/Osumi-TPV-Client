import type { InitializeVentaTicketBaiPendingRecordCommand } from '@backend/contracts/ventas/venta-ticket-bai-record-command.interface';
import type { VentaTicketBaiRecord } from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmVentasTicketBaiRepository from '@infrastructure/database/typeorm/typeorm-ventas-ticket-bai.repository';
import TypeOrmVentasTicketsRepository from '@infrastructure/database/typeorm/typeorm-ventas-tickets.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface VentaRevisionRow {
  readonly ticket_revision: number;
  readonly ticket_pdf_revision: number;
}

let tempDirectory: string | null = null;

let applicationDatabase: TypeOrmApplicationDatabase | null = null;

let repository: TypeOrmVentasTicketBaiRepository | null = null;

describe('TypeOrmVentasTicketBaiRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-ticketbai-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'ticketbai.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedSale(dataSource);

    repository = new TypeOrmVentasTicketBaiRepository(applicationDatabase);
  });

  afterEach(async (): Promise<void> => {
    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('inicializa no_aplica de forma idempotente', async (): Promise<void> => {
    const currentRepository = requireRepository();

    const first: VentaTicketBaiRecord = await currentRepository.initializeNoAplica(1);

    const second: VentaTicketBaiRecord = await currentRepository.initializeNoAplica(1);

    expect(first.estado).toBe('no_aplica');

    expect(second).toEqual(first);

    expect(second.entorno).toBeNull();
    expect(second.nifEmisor).toBeNull();
    expect(second.serie).toBeNull();
    expect(second.numero).toBeNull();
    expect(second.intentos).toBe(0);
  });

  it('congela idempotentemente la identidad fiscal pendiente', async (): Promise<void> => {
    const currentRepository = requireRepository();

    const command = createPendingCommand();

    const first: VentaTicketBaiRecord = await currentRepository.initializePending(command);

    const second: VentaTicketBaiRecord = await currentRepository.initializePending(command);

    expect(second).toEqual(first);

    expect(second).toMatchObject({
      idVenta: 1,
      entorno: 'production',
      nifEmisor: 'B12345678',
      serie: 'TPV01',
      numero: '000001',
      estado: 'pendiente',
      intentos: 0,
      solicitudPayload: '{"ticket":"request"}',
    });
  });

  it('rechaza cambiar una identidad fiscal ya congelada', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());

    await expect(
      currentRepository.initializePending({
        ...createPendingCommand(),
        numero: '000002',
      }),
    ).rejects.toThrow(
      ['La venta ya tiene una identidad TicketBAI', 'distinta de la que se intenta utilizar.'].join(
        ' ',
      ),
    );
  });

  it('adquiere una sola vez el intento inicial', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());

    const firstAttempt: VentaTicketBaiRecord | null =
      await currentRepository.beginInitialAttempt(1);

    const secondAttempt: VentaTicketBaiRecord | null =
      await currentRepository.beginInitialAttempt(1);

    expect(firstAttempt).not.toBeNull();

    expect(firstAttempt?.estado).toBe('enviando');

    expect(firstAttempt?.intentos).toBe(1);

    expect(firstAttempt?.enviadoAt).not.toBeNull();

    expect(secondAttempt).toBeNull();
  });

  it('no permite adquirir un intento manual desde un error temporal', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);

    const failed: VentaTicketBaiRecord = await currentRepository.markFailure({
      idVenta: 1,
      estado: 'error_temporal',
      ultimoError: 'No se ha podido confirmar el envío.',
      respuestaPayload: null,
    });

    expect(failed.estado).toBe('error_temporal');
    expect(failed.intentos).toBe(1);

    const retry: VentaTicketBaiRecord | null = await currentRepository.beginManualAttempt(1);

    expect(retry).toBeNull();

    const current: VentaTicketBaiRecord | null = await currentRepository.findByVentaId(1);

    expect(current?.estado).toBe('error_temporal');
    expect(current?.intentos).toBe(1);
  });

  it('adquiere una sola vez un intento manual desde una factura rechazada', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);

    const rejected: VentaTicketBaiRecord = await currentRepository.markFailure({
      idVenta: 1,
      estado: 'rechazada',
      ultimoError: 'TicketBAI ha rechazado la factura.',
      respuestaPayload: '{"result":"ERROR"}',
    });

    expect(rejected.estado).toBe('rechazada');
    expect(rejected.intentos).toBe(1);

    const firstRetry: VentaTicketBaiRecord | null = await currentRepository.beginManualAttempt(1);

    const secondRetry: VentaTicketBaiRecord | null = await currentRepository.beginManualAttempt(1);

    expect(firstRetry?.estado).toBe('enviando');
    expect(firstRetry?.intentos).toBe(2);
    expect(firstRetry?.ultimoError).toBeNull();
    expect(firstRetry?.respuestaPayload).toBeNull();

    expect(secondRetry).toBeNull();
  });

  it('conserva el acknowledgement del reenvío sin alterar la revisión documental', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);
    await currentRepository.markFailure({
      idVenta: 1,
      estado: 'rechazada',
      ultimoError: 'TicketBAI ha rechazado la factura.',
      respuestaPayload: '{"result":"ERROR"}',
    });

    const attempt: VentaTicketBaiRecord | null = await currentRepository.beginManualAttempt(1);

    expect(attempt?.estado).toBe('enviando');
    expect(attempt?.intentos).toBe(2);

    const acknowledged: VentaTicketBaiRecord = await currentRepository.markAttemptAcknowledged({
      idVenta: 1,
      respuestaPayload: '{"result":"OK","return":{}}',
    });

    expect(acknowledged.estado).toBe('enviando');
    expect(acknowledged.intentos).toBe(2);
    expect(acknowledged.ultimoError).toBeNull();
    expect(acknowledged.respuestaPayload).toBe('{"result":"OK","return":{}}');

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 1,
      ticket_pdf_revision: 0,
    });
  });

  it('acepta TicketBAI e invalida exactamente una vez la revisión documental', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());

    await currentRepository.beginInitialAttempt(1);

    const accepted: VentaTicketBaiRecord = await currentRepository.markAccepted({
      idVenta: 1,
      huella: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
      respuestaPayload: '{"result":"OK"}',
    });

    expect(accepted.estado).toBe('aceptada');

    expect(accepted.huella).toBe('HUELLA-TBAI');

    const revisionAfterAcceptance: VentaRevisionRow = await readVentaRevision();

    expect(revisionAfterAcceptance).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });

    const repeated: VentaTicketBaiRecord = await currentRepository.markAccepted({
      idVenta: 1,
      huella: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
      respuestaPayload: '{"result":"OK"}',
    });

    expect(repeated.estado).toBe('aceptada');

    const revisionAfterRepeat: VentaRevisionRow = await readVentaRevision();

    expect(revisionAfterRepeat).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });
  });

  it('persiste PENDING y acepta después sin duplicar la revisión documental', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);

    const remotePending: VentaTicketBaiRecord = await currentRepository.markRemotePending({
      idVenta: 1,
      huella: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
      respuestaPayload: '{"result":"PENDING"}',
    });

    expect(remotePending.estado).toBe('pendiente_remoto');
    expect(remotePending.huella).toBe('HUELLA-TBAI');
    expect(remotePending.qr).toBe('QR-BASE64');
    expect(remotePending.url).toBe('https://example.test/tbai');
    expect(remotePending.respuestaPayload).toBe('{"result":"PENDING"}');
    expect(remotePending.aceptadoAt).toBeNull();

    const revisionAfterPending: VentaRevisionRow = await readVentaRevision();

    expect(revisionAfterPending).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });

    const ticketsRepository = new TypeOrmVentasTicketsRepository(requireDatabase());
    const ticket = await ticketsRepository.findByVentaId(1);

    expect(ticket?.ticketBai).toEqual({
      serie: 'TPV01',
      numero: '000001',
      identificativo: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
    });

    const repeatedPending: VentaTicketBaiRecord = await currentRepository.markRemotePending({
      idVenta: 1,
      huella: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
      respuestaPayload: '{"result":"PENDING"}',
    });

    expect(repeatedPending.estado).toBe('pendiente_remoto');

    const revisionAfterPendingRepeat: VentaRevisionRow = await readVentaRevision();

    expect(revisionAfterPendingRepeat).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });

    const accepted: VentaTicketBaiRecord = await currentRepository.markAccepted({
      idVenta: 1,
      huella: 'HUELLA-TBAI',
      qr: 'QR-BASE64',
      url: 'https://example.test/tbai',
      respuestaPayload: '{"result":"OK"}',
    });

    expect(accepted.estado).toBe('aceptada');
    expect(accepted.huella).toBe('HUELLA-TBAI');
    expect(accepted.qr).toBe('QR-BASE64');
    expect(accepted.url).toBe('https://example.test/tbai');
    expect(accepted.respuestaPayload).toBe('{"result":"OK"}');
    expect(accepted.aceptadoAt).not.toBeNull();

    const revisionAfterAcceptance: VentaRevisionRow = await readVentaRevision();

    expect(revisionAfterAcceptance).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });
  });

  it('incrementa otra revisión si el artefacto cambia al aceptar un PENDING', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);

    await currentRepository.markRemotePending({
      idVenta: 1,
      huella: 'HUELLA-PENDING',
      qr: 'QR-PENDING',
      url: 'https://example.test/tbai/pending',
      respuestaPayload: '{"result":"PENDING"}',
    });

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });

    const accepted: VentaTicketBaiRecord = await currentRepository.markAccepted({
      idVenta: 1,
      huella: 'HUELLA-OK',
      qr: 'QR-OK',
      url: 'https://example.test/tbai/ok',
      respuestaPayload: '{"result":"OK"}',
    });

    expect(accepted.estado).toBe('aceptada');
    expect(accepted.huella).toBe('HUELLA-OK');
    expect(accepted.qr).toBe('QR-OK');
    expect(accepted.url).toBe('https://example.test/tbai/ok');

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 3,
      ticket_pdf_revision: 0,
    });
  });

  it('reconcilia un error temporal como PENDING e invalida la revisión documental', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);
    await currentRepository.markFailure({
      idVenta: 1,
      estado: 'error_temporal',
      ultimoError: 'No se ha podido confirmar el envío.',
      respuestaPayload: null,
    });

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 1,
      ticket_pdf_revision: 0,
    });

    const remotePending: VentaTicketBaiRecord = await currentRepository.markRemotePending({
      idVenta: 1,
      huella: 'HUELLA-RECONCILIADA',
      qr: 'QR-RECONCILIADO',
      url: 'https://example.test/tbai/reconciliada',
      respuestaPayload: '{"result":"OK","return":{"status":"PENDING"}}',
    });

    expect(remotePending.estado).toBe('pendiente_remoto');
    expect(remotePending.huella).toBe('HUELLA-RECONCILIADA');
    expect(remotePending.qr).toBe('QR-RECONCILIADO');
    expect(remotePending.url).toBe('https://example.test/tbai/reconciliada');
    expect(remotePending.ultimoError).toBeNull();

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });
  });

  it('reconcilia un error temporal como aceptada e invalida la revisión documental', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);
    await currentRepository.markFailure({
      idVenta: 1,
      estado: 'error_temporal',
      ultimoError: 'No se ha podido confirmar el envío.',
      respuestaPayload: null,
    });

    const accepted: VentaTicketBaiRecord = await currentRepository.markAccepted({
      idVenta: 1,
      huella: 'HUELLA-RECONCILIADA',
      qr: 'QR-RECONCILIADO',
      url: 'https://example.test/tbai/reconciliada',
      respuestaPayload: '{"result":"OK","return":{"status":"OK"}}',
    });

    expect(accepted.estado).toBe('aceptada');
    expect(accepted.huella).toBe('HUELLA-RECONCILIADA');
    expect(accepted.qr).toBe('QR-RECONCILIADO');
    expect(accepted.url).toBe('https://example.test/tbai/reconciliada');
    expect(accepted.ultimoError).toBeNull();
    expect(accepted.aceptadoAt).not.toBeNull();

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });
  });

  it('invalida el documento fiscal cuando un PENDING se reconcilia como ERROR', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);
    await currentRepository.markRemotePending({
      idVenta: 1,
      huella: 'HUELLA-PENDING',
      qr: 'QR-PENDING',
      url: 'https://example.test/tbai/pending',
      respuestaPayload: '{"result":"PENDING"}',
    });

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 2,
      ticket_pdf_revision: 0,
    });

    const rejected: VentaTicketBaiRecord = await currentRepository.markReconciledRejected({
      idVenta: 1,
      huella: 'HUELLA-PENDING',
      qr: 'QR-PENDING',
      url: 'https://example.test/tbai/pending',
      ultimoError: 'TicketBaiWS informa que la factura se encuentra en estado ERROR.',
      respuestaPayload: '{"result":"OK","return":{"status":"ERROR"}}',
    });

    expect(rejected.estado).toBe('rechazada');
    expect(rejected.ultimoError).toBe(
      'TicketBaiWS informa que la factura se encuentra en estado ERROR.',
    );

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 3,
      ticket_pdf_revision: 0,
    });

    const ticketsRepository = new TypeOrmVentasTicketsRepository(requireDatabase());
    const ticket = await ticketsRepository.findByVentaId(1);

    expect(ticket?.ticketBai).toBeNull();
  });

  it('no invalida la revisión al reconciliar como ERROR una venta sin artefacto fiscal previo', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());
    await currentRepository.beginInitialAttempt(1);
    await currentRepository.markFailure({
      idVenta: 1,
      estado: 'error_temporal',
      ultimoError: 'No se ha podido confirmar el envío.',
      respuestaPayload: null,
    });

    const rejected: VentaTicketBaiRecord = await currentRepository.markReconciledRejected({
      idVenta: 1,
      huella: 'HUELLA-ERROR',
      qr: 'QR-ERROR',
      url: 'https://example.test/tbai/error',
      ultimoError: 'TicketBaiWS informa que la factura se encuentra en estado ERROR.',
      respuestaPayload: '{"result":"OK","return":{"status":"ERROR"}}',
    });

    expect(rejected.estado).toBe('rechazada');

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 1,
      ticket_pdf_revision: 0,
    });
  });

  it('no permite aceptar desde pendiente ni modifica la revisión', async (): Promise<void> => {
    const currentRepository = requireRepository();

    await currentRepository.initializePending(createPendingCommand());

    await expect(
      currentRepository.markAccepted({
        idVenta: 1,
        huella: 'HUELLA',
        qr: 'QR',
        url: 'URL',
        respuestaPayload: '{}',
      }),
    ).rejects.toThrow(
      ['La venta no se encuentra en un estado', 'válido para aceptar TicketBAI.'].join(' '),
    );

    expect(await readVentaRevision()).toEqual({
      ticket_revision: 1,
      ticket_pdf_revision: 0,
    });
  });
});

/**
 * Recupera el repository preparado para el test.
 */
function requireRepository(): TypeOrmVentasTicketBaiRepository {
  if (repository === null) {
    throw new Error('El repository TicketBAI no está inicializado.');
  }

  return repository;
}

/**
 * Recupera la base de datos preparada para el test.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos del test no está inicializada.');
  }

  return applicationDatabase;
}

/**
 * Construye el comando fiscal utilizado
 * en las pruebas del repository.
 */
function createPendingCommand(): InitializeVentaTicketBaiPendingRecordCommand {
  return {
    idVenta: 1,
    entorno: 'production',
    nifEmisor: 'B12345678',
    serie: 'TPV01',
    numero: '000001',
    solicitudPayload: '{"ticket":"request"}',
  };
}

/**
 * Crea el esquema canónico completo
 * en la base de datos temporal.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('PRAGMA foreign_keys = ON');

  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Crea las dependencias mínimas y una venta
 * sobre la que ejecutar las pruebas fiscales.
 */
async function seedSale(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO terminal (
        public_id,
        nombre,
        codigo
      )
      VALUES (
        'terminal-1',
        'Terminal test',
        'TEST-1'
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO empleado (
        public_id,
        nombre,
        password_hash,
        password_algorithm,
        color,
        admin,
        activo
      )
      VALUES (
        'empleado-1',
        'Empleado test',
        'hash-test',
        'scrypt',
        'FFFFFF',
        1,
        1
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO caja (
        public_id,
        id_terminal,
        id_empleado_apertura,
        apertura
      )
      VALUES (
        'caja-1',
        (
          SELECT id
          FROM terminal
          WHERE public_id = 'terminal-1'
        ),
        (
          SELECT id
          FROM empleado
          WHERE public_id = 'empleado-1'
        ),
        '2026-08-27T10:00:00.000Z'
      )
    `,
  );

  await dataSource.query(
    `
      INSERT INTO venta (
        id,
        public_id,
        id_caja,
        id_empleado,
        serie,
        numero,
        total_cents,
        created_at,
        updated_at
      )
      VALUES (
        1,
        'venta-ticketbai-1',
        (
          SELECT id
          FROM caja
          WHERE public_id = 'caja-1'
        ),
        (
          SELECT id
          FROM empleado
          WHERE public_id = 'empleado-1'
        ),
        '',
        1,
        1210,
        '2026-08-27T10:15:00.000Z',
        '2026-08-27T10:15:00.000Z'
      )
    `,
  );
}

/**
 * Recupera las revisiones documentales actuales
 * de la venta utilizada por los tests.
 */
async function readVentaRevision(): Promise<VentaRevisionRow> {
  const dataSource: DataSource = await requireDatabase().connect();

  const rows: readonly VentaRevisionRow[] = (await dataSource.query(
    `
          SELECT
            ticket_revision,
            ticket_pdf_revision
          FROM venta
          WHERE id = 1
        `,
  )) as readonly VentaRevisionRow[];

  const row: VentaRevisionRow | undefined = rows[0];

  if (row === undefined) {
    throw new Error('No se encuentra la venta del test.');
  }

  return row;
}
