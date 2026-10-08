import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';

/**
 * Punto único de entrada para registrar
 * eventos técnicos de la aplicación.
 */
export default interface ApplicationLogger {
  /**
   * Registra información de diagnóstico detallada.
   */
  debug(event: ApplicationLogEvent): void;

  /**
   * Registra un hito operativo relevante.
   */
  info(event: ApplicationLogEvent): void;

  /**
   * Registra una incidencia recuperable que no
   * impide continuar con la operación principal.
   */
  warn(event: ApplicationLogEvent): void;

  /**
   * Registra el fallo de una operación.
   */
  error(event: ApplicationLogEvent): void;

  /**
   * Espera a que todas las entradas pendientes
   * hayan sido procesadas antes de continuar.
   */
  flush(): Promise<void>;
}
