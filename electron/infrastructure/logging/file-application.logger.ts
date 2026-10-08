import ApplicationErrorNormalizer from '@backend/application/logging/application-error-normalizer';
import ApplicationLogTextSanitizer from '@backend/application/logging/application-log-text-sanitizer';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type {
  ApplicationLogContext,
  ApplicationLogContextValue,
  ApplicationLogEvent,
  ApplicationLogLevel,
  ApplicationLogRecord,
  NormalizedApplicationError,
} from '@backend/domain/logging/application-log.types';
import { Buffer } from 'node:buffer';
import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Logger persistente de Osumi TPV.
 *
 * Todas las escrituras comparten una única cola
 * para conservar el orden y evitar carreras durante
 * escritura y rotación de los ficheros.
 */
export default class FileApplicationLogger implements ApplicationLogger {
  private static readonly CURRENT_FILE_NAME: string = 'osumi-tpv.log';

  private static readonly MAX_FILE_SIZE_BYTES: number = 10 * 1024 * 1024;
  private static readonly MAX_FILES: number = 5;

  private static readonly MAX_AREA_LENGTH: number = 100;
  private static readonly MAX_OPERATION_LENGTH: number = 120;
  private static readonly MAX_MESSAGE_LENGTH: number = 4_096;
  private static readonly MAX_APP_VERSION_LENGTH: number = 100;

  private static readonly MAX_CONTEXT_ENTRIES: number = 32;
  private static readonly MAX_CONTEXT_KEY_LENGTH: number = 100;
  private static readonly MAX_CONTEXT_STRING_LENGTH: number = 4_096;

  /*
   * Una sola línea nunca debe acercarse por sí sola
   * al límite de 10 MiB del fichero.
   */
  private static readonly MAX_RECORD_SIZE_BYTES: number = 256 * 1024;

  private pendingWrite: Promise<void> = Promise.resolve();

  private readonly normalizedAppVersion: string;

  /**
   * Crea el logger persistente.
   */
  constructor(
    private readonly logsDirectory: string,
    appVersion: string,
    private readonly errorNormalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer(),
    private readonly textSanitizer: ApplicationLogTextSanitizer = new ApplicationLogTextSanitizer(),
    private readonly now: () => Date = (): Date => new Date(),
  ) {
    this.normalizedAppVersion = this.normalizeRequiredText(
      appVersion,
      'unknown',
      FileApplicationLogger.MAX_APP_VERSION_LENGTH,
    );
  }

  /**
   * Registra información de diagnóstico detallada.
   */
  debug(event: ApplicationLogEvent): void {
    this.enqueue('debug', event);
  }

  /**
   * Registra un hito operativo relevante.
   */
  info(event: ApplicationLogEvent): void {
    this.enqueue('info', event);
  }

  /**
   * Registra una incidencia recuperable.
   */
  warn(event: ApplicationLogEvent): void {
    this.enqueue('warn', event);
  }

  /**
   * Registra el fallo de una operación.
   */
  error(event: ApplicationLogEvent): void {
    this.enqueue('error', event);
  }

  /**
   * Espera hasta que todas las entradas que ya estaban
   * encoladas hayan terminado de procesarse.
   */
  flush(): Promise<void> {
    return this.pendingWrite;
  }

  /**
   * Prepara inmediatamente una entrada y la añade
   * a la cola única de escritura.
   *
   * Ni la normalización ni el filesystem pueden
   * propagar errores al flujo operativo.
   */
  private enqueue(level: ApplicationLogLevel, event: ApplicationLogEvent): void {
    let line: string;

    try {
      line = this.createLine(level, event);
    } catch (error: unknown) {
      this.reportEmergencyFailure(error);

      return;
    }

    this.pendingWrite = this.pendingWrite
      .then((): Promise<void> => this.writeLine(line))
      .catch((error: unknown): void => {
        this.reportEmergencyFailure(error);
      });
  }

  /**
   * Construye el registro seguro correspondiente
   * a un evento de aplicación.
   */
  private createRecord(
    level: ApplicationLogLevel,
    event: ApplicationLogEvent,
  ): ApplicationLogRecord {
    const date: Date = this.now();

    if (Number.isNaN(date.getTime())) {
      throw new Error('La fecha de la entrada de log no es válida.');
    }

    const error: NormalizedApplicationError | null =
      event.error === undefined ? null : this.errorNormalizer.normalize(event.error);

    return {
      schemaVersion: 1,
      timestamp: date.toISOString(),
      level,
      source: event.source ?? 'main',
      area: this.normalizeRequiredText(
        event.area,
        'application',
        FileApplicationLogger.MAX_AREA_LENGTH,
      ),
      operation: this.normalizeRequiredText(
        event.operation,
        'unknown',
        FileApplicationLogger.MAX_OPERATION_LENGTH,
      ),
      message: this.normalizeRequiredText(
        event.message,
        'Entrada de log sin mensaje.',
        FileApplicationLogger.MAX_MESSAGE_LENGTH,
      ),
      appVersion: this.normalizedAppVersion,
      context: this.normalizeContext(event.context),
      error,
    };
  }

  /**
   * Serializa una entrada como JSON Lines.
   *
   * Si el árbol completo del error supera el límite
   * defensivo, se conserva su cabecera y se descartan
   * stack, causas y contexto para evitar una línea gigante.
   */
  private createLine(level: ApplicationLogLevel, event: ApplicationLogEvent): string {
    const record: ApplicationLogRecord = this.createRecord(level, event);

    const line: string = `${JSON.stringify(record)}\n`;

    if (Buffer.byteLength(line, 'utf8') <= FileApplicationLogger.MAX_RECORD_SIZE_BYTES) {
      return line;
    }

    const reducedRecord: ApplicationLogRecord = {
      ...record,
      message: this.textSanitizer.sanitize(record.message, 1_024),
      context: {
        logRecordTruncated: true,
      },
      error:
        record.error === null
          ? null
          : {
              name: record.error.name,
              message: record.error.message,
              stack: null,
              cause: null,
              errors: null,
            },
    };

    const reducedLine: string = `${JSON.stringify(reducedRecord)}\n`;

    if (Buffer.byteLength(reducedLine, 'utf8') > FileApplicationLogger.MAX_RECORD_SIZE_BYTES) {
      throw new Error('La entrada de log supera el tamaño máximo permitido.');
    }

    return reducedLine;
  }

  /**
   * Normaliza únicamente el contexto explícito
   * aportado por la capa que registra el evento.
   */
  private normalizeContext(
    context: ApplicationLogContext | undefined,
  ): ApplicationLogContext | null {
    if (context === undefined) {
      return null;
    }

    const normalized: Record<string, ApplicationLogContextValue> = Object.create(null) as Record<
      string,
      ApplicationLogContextValue
    >;

    const entries = Object.entries(context).slice(0, FileApplicationLogger.MAX_CONTEXT_ENTRIES);

    for (const [rawKey, rawValue] of entries) {
      const key: string = this.textSanitizer
        .sanitize(rawKey, FileApplicationLogger.MAX_CONTEXT_KEY_LENGTH)
        .trim();

      if (key === '') {
        continue;
      }

      if (this.isSensitiveContextKey(key)) {
        normalized[key] = '[REDACTED]';

        continue;
      }

      if (typeof rawValue === 'string') {
        normalized[key] = this.textSanitizer.sanitize(
          rawValue,
          FileApplicationLogger.MAX_CONTEXT_STRING_LENGTH,
        );

        continue;
      }

      if (typeof rawValue === 'number' && !Number.isFinite(rawValue)) {
        normalized[key] = null;

        continue;
      }

      normalized[key] = rawValue;
    }

    return Object.keys(normalized).length === 0 ? null : normalized;
  }

  /**
   * Identifica nombres de contexto que no deben
   * contener nunca su valor real en un log.
   */
  private isSensitiveContextKey(key: string): boolean {
    const normalized: string = key.toLocaleLowerCase('en-US');

    return (
      normalized === 'authorization' ||
      normalized === 'pass' ||
      normalized.includes('password') ||
      normalized.includes('contraseña') ||
      normalized.includes('secret') ||
      normalized.includes('token') ||
      normalized.includes('apikey')
    );
  }

  /**
   * Sanitiza un texto obligatorio y utiliza
   * un fallback cuando queda vacío.
   */
  private normalizeRequiredText(value: string, fallback: string, maxLength: number): string {
    const normalized: string = this.textSanitizer.sanitize(value, maxLength).trim();

    return normalized === '' ? fallback : normalized;
  }

  /**
   * Escribe una línea después de asegurar que
   * el fichero activo dispone de espacio suficiente.
   */
  private async writeLine(line: string): Promise<void> {
    await mkdir(this.logsDirectory, {
      recursive: true,
    });

    const lineSizeBytes: number = Buffer.byteLength(line, 'utf8');

    await this.rotateIfNeeded(lineSizeBytes);

    await appendFile(this.getLogFilePath(0), line, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }

  /**
   * Rota los cinco ficheros cuando la nueva entrada
   * haría superar los 10 MiB al fichero activo.
   */
  private async rotateIfNeeded(nextLineSizeBytes: number): Promise<void> {
    const currentFilePath: string = this.getLogFilePath(0);

    const currentSizeBytes: number = await this.getFileSize(currentFilePath);

    if (
      currentSizeBytes === 0 ||
      currentSizeBytes + nextLineSizeBytes <= FileApplicationLogger.MAX_FILE_SIZE_BYTES
    ) {
      return;
    }

    await this.rotate();
  }

  /**
   * Ejecuta una rotación completa:
   *
   * .4 se elimina
   * .3 → .4
   * .2 → .3
   * .1 → .2
   * actual → .1
   */
  private async rotate(): Promise<void> {
    await rm(this.getLogFilePath(FileApplicationLogger.MAX_FILES - 1), {
      force: true,
    });

    for (let index: number = FileApplicationLogger.MAX_FILES - 2; index >= 0; index--) {
      const source: string = this.getLogFilePath(index);
      const destination: string = this.getLogFilePath(index + 1);

      try {
        await rename(source, destination);
      } catch (error: unknown) {
        if (!this.isFileNotFoundError(error)) {
          throw error;
        }
      }
    }
  }

  /**
   * Obtiene el tamaño actual de un fichero,
   * considerando inexistencia como tamaño cero.
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const fileStat = await stat(filePath);

      return fileStat.size;
    } catch (error: unknown) {
      if (this.isFileNotFoundError(error)) {
        return 0;
      }

      throw error;
    }
  }

  /**
   * Construye la ruta de cualquiera de los
   * cinco ficheros de rotación.
   */
  private getLogFilePath(index: number): string {
    if (index === 0) {
      return join(this.logsDirectory, FileApplicationLogger.CURRENT_FILE_NAME);
    }

    return join(this.logsDirectory, `osumi-tpv.${index}.log`);
  }

  /**
   * Identifica errores ENOENT del filesystem.
   */
  private isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  }

  /**
   * Último recurso cuando el propio logger no puede
   * normalizar o persistir una entrada.
   *
   * Nunca relanza el error.
   */
  private reportEmergencyFailure(error: unknown): void {
    console.error('No se ha podido persistir una entrada del log de Osumi TPV:', error);
  }
}
