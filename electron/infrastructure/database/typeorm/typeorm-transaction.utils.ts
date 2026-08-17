import type { DataSource, QueryRunner } from 'typeorm';

type QueryRunnerTransactionOperation<T> = (queryRunner: QueryRunner) => Promise<T>;

/**
 * Ejecuta una operación dentro de una transacción utilizando
 * un QueryRunner cuyo ciclo de vida pertenece al consumidor.
 *
 * Esta función NO conecta ni libera el QueryRunner.
 */
export async function runQueryRunnerTransaction<T>(
  queryRunner: QueryRunner,
  operation: QueryRunnerTransactionOperation<T>,
): Promise<T> {
  await queryRunner.startTransaction();

  try {
    const result: T = await operation(queryRunner);

    await queryRunner.commitTransaction();

    return result;
  } catch (error: unknown) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }

    throw error;
  }
}

/**
 * Ejecuta una operación dentro de una transacción utilizando
 * un QueryRunner creado específicamente para ella.
 *
 * Esta función es responsable de:
 * - crear el QueryRunner;
 * - conectarlo;
 * - ejecutar la transacción;
 * - liberarlo al finalizar.
 */
export async function runDataSourceTransaction<T>(
  dataSource: DataSource,
  operation: QueryRunnerTransactionOperation<T>,
): Promise<T> {
  const queryRunner: QueryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();

  try {
    return await runQueryRunnerTransaction(queryRunner, operation);
  } finally {
    if (!queryRunner.isReleased) {
      await queryRunner.release();
    }
  }
}
