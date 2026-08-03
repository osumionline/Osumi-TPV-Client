import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportRunner from '@backend/contracts/legacy-import-runner.interface';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type {
  LegacyImportWorkerData,
  LegacyImportWorkerMessage,
} from '@backend/domain/legacy-import/legacy-import-worker-contracts';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';
import { Worker } from 'node:worker_threads';

export default class NodeLegacyImportRunner implements LegacyImportRunner {
  constructor(
    private readonly workerPath: string,
    private readonly databaseFile: string,
    private readonly applicationVersion: string,
  ) {}

  run(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportStartResult> {
    const data: LegacyImportWorkerData = {
      command,
      databaseFile: this.databaseFile,
      applicationVersion: this.applicationVersion,
    };

    return new Promise<LegacyImportStartResult>(
      (
        resolve: (result: LegacyImportStartResult) => void,
        reject: (reason?: unknown) => void,
      ): void => {
        const worker: Worker = new Worker(this.workerPath, {
          workerData: data,
        });

        let completed: boolean = false;

        worker.on('message', (value: unknown): void => {
          if (!this.isWorkerMessage(value)) {
            completed = true;

            void worker.terminate();

            reject(new Error('El Worker ha devuelto un mensaje no válido.'));

            return;
          }

          switch (value.type) {
            case 'progress':
              progressListener(value.progress);

              return;

            case 'completed':
              completed = true;

              resolve(value.result);

              return;

            case 'failed':
              completed = true;

              console.error(
                ['Error en el Worker de importación.', value.message, value.stack ?? ''].join('\n'),
              );

              reject(new Error(value.message));

              return;
          }
        });

        worker.once('error', (error: Error): void => {
          if (completed) {
            return;
          }

          completed = true;

          reject(
            new Error('El Worker de importación ha fallado.', {
              cause: error,
            }),
          );
        });

        worker.once('exit', (exitCode: number): void => {
          if (completed) {
            return;
          }

          completed = true;

          reject(
            new Error(
              ['El Worker de importación ha terminado', `sin resultado. Código: ${exitCode}.`].join(
                ' ',
              ),
            ),
          );
        });
      },
    );
  }

  private isWorkerMessage(value: unknown): value is LegacyImportWorkerMessage {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const type: unknown = (value as Record<string, unknown>)['type'];

    return type === 'progress' || type === 'completed' || type === 'failed';
  }
}
