import type { QueryRunner } from 'typeorm';

interface LastInsertIdDatabaseRow {
  readonly id: number;
}

/**
 * Recupera el identificador autogenerado por el último
 * INSERT ejecutado en la conexión SQLite del QueryRunner.
 *
 * Debe utilizarse con el mismo QueryRunner que ejecutó
 * el INSERT, ya que last_insert_rowid() pertenece a la
 * conexión SQLite.
 */
export async function getLastInsertId(
  queryRunner: QueryRunner,
  errorMessage: string,
): Promise<number> {
  const rows: readonly LastInsertIdDatabaseRow[] = (await queryRunner.query(`
        SELECT
          last_insert_rowid() AS id
      `)) as readonly LastInsertIdDatabaseRow[];

  const id: number | undefined = rows[0]?.id;

  if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error(errorMessage);
  }

  return id;
}
