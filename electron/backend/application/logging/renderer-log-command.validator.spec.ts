import RendererLogCommandValidator from '@backend/application/logging/renderer-log-command.validator';
import type {
  RendererLogCommand,
  RendererLogError,
} from '@desktop-contracts/logging/renderer-log-command';
import { describe, expect, it } from 'vitest';

describe('RendererLogCommandValidator', (): void => {
  it('acepta un comando completo válido', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    const result: RendererLogCommand = validator.validate({
      level: 'error',
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: {
        name: 'Error',
        message: 'La impresora no está disponible.',
        stack: 'Error: La impresora no está disponible.',
        cause: null,
        errors: null,
      },
    });

    expect(result).toEqual({
      level: 'error',
      area: 'ventas',
      operation: 'print-ticket',
      message: 'No se ha podido imprimir el ticket.',
      context: {
        ventaId: 1234,
        automatico: false,
      },
      error: {
        name: 'Error',
        message: 'La impresora no está disponible.',
        stack: 'Error: La impresora no está disponible.',
        cause: null,
        errors: null,
      },
    });
  });

  it('rechaza propiedades adicionales en el comando', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    expect((): RendererLogCommand =>
      validator.validate({
        ...createValidCommand(),
        secret: 'no-debe-transportarse',
      }),
    ).toThrow('El comando de logging contiene una estructura no permitida.');
  });

  it('rechaza objetos dentro del contexto', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    expect((): RendererLogCommand =>
      validator.validate({
        ...createValidCommand(),
        context: {
          request: {
            token: 'secreto',
          },
        },
      }),
    ).toThrow('El contexto de logging contiene un valor no permitido.');
  });

  it('rechaza un nivel desconocido', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    expect((): RendererLogCommand =>
      validator.validate({
        ...createValidCommand(),
        level: 'critical',
      }),
    ).toThrow('El nivel de logging no es válido.');
  });

  it('rechaza cadenas de causas demasiado profundas', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    let error: RendererLogError = createError('Nivel 6');

    for (let index: number = 5; index >= 1; index--) {
      error = {
        ...createError(`Nivel ${index}`),
        cause: error,
      };
    }

    expect((): RendererLogCommand =>
      validator.validate({
        ...createValidCommand(),
        error,
      }),
    ).toThrow('El error de logging supera la profundidad máxima permitida.');
  });

  it('rechaza más de cinco errores agregados', (): void => {
    const validator: RendererLogCommandValidator = new RendererLogCommandValidator();

    expect((): RendererLogCommand =>
      validator.validate({
        ...createValidCommand(),
        error: {
          ...createError('Aggregate'),
          errors: Array.from(
            {
              length: 6,
            },
            (_value: unknown, index: number): RendererLogError => createError(`Error ${index}`),
          ),
        },
      }),
    ).toThrow('Los errores agregados del log no son válidos.');
  });
});

/**
 * Construye un comando Renderer válido.
 */
function createValidCommand(): RendererLogCommand {
  return {
    level: 'warn',
    area: 'application',
    operation: 'test',
    message: 'Mensaje de prueba.',
    context: null,
    error: null,
  };
}

/**
 * Construye un Error Renderer mínimo válido.
 */
function createError(message: string): RendererLogError {
  return {
    name: 'Error',
    message,
    stack: null,
    cause: null,
    errors: null,
  };
}
