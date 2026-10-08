import ApplicationErrorNormalizer from '@backend/application/logging/application-error-normalizer';
import { TicketBaiClientError } from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type { NormalizedApplicationError } from '@backend/domain/logging/application-log.types';
import { describe, expect, it } from 'vitest';

describe('ApplicationErrorNormalizer', (): void => {
  it('normaliza nombre, mensaje y stack de un Error', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const error: Error = new TypeError('Dato incorrecto.');

    const result: NormalizedApplicationError = normalizer.normalize(error);

    expect(result.name).toBe('TypeError');
    expect(result.message).toBe('Dato incorrecto.');
    expect(result.stack).toContain('TypeError: Dato incorrecto.');
    expect(result.cause).toBeNull();
    expect(result.errors).toBeNull();
  });

  it('conserva la cadena estándar de causas', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const cause: Error = new Error('Fallo de red.');

    const error: Error = new Error('No se ha podido completar la operación.', {
      cause,
    });

    const result: NormalizedApplicationError = normalizer.normalize(error);

    expect(result.message).toBe('No se ha podido completar la operación.');
    expect(result.cause?.message).toBe('Fallo de red.');
  });

  it('normaliza los errores internos de AggregateError', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const error: AggregateError = new AggregateError(
      [new Error('Primer fallo.'), new TypeError('Segundo fallo.')],
      'Han fallado varias operaciones.',
    );

    const result: NormalizedApplicationError = normalizer.normalize(error);

    expect(result.name).toBe('AggregateError');
    expect(result.errors).toHaveLength(2);
    expect(result.errors?.[0]?.message).toBe('Primer fallo.');
    expect(result.errors?.[1]?.name).toBe('TypeError');
  });

  it('no serializa propiedades específicas del error original', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const error: TicketBaiClientError = new TicketBaiClientError(
      'temporary',
      'TicketBAI no está disponible.',
      '{"token":"secreto-que-no-debe-aparecer"}',
      503,
    );

    const result: NormalizedApplicationError = normalizer.normalize(error);

    const serialized: string = JSON.stringify(result);

    expect(serialized).not.toContain('responsePayload');
    expect(serialized).not.toContain('secreto-que-no-debe-aparecer');
    expect(serialized).not.toContain('httpStatus');
    expect(serialized).not.toContain('"kind"');
  });

  it('no serializa un valor desconocido lanzado como error', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const result: NormalizedApplicationError = normalizer.normalize({
      token: 'token-secreto',
      request: {
        password: 'password-secreto',
      },
    });

    const serialized: string = JSON.stringify(result);

    expect(result.name).toBe('UnknownError');
    expect(serialized).not.toContain('token-secreto');
    expect(serialized).not.toContain('password-secreto');
  });

  it('redacta patrones evidentes de credenciales en los textos', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const error: Error = new Error(
      'Authorization: Bearer abc.def.ghi token=token-secreto password=password-secreto',
    );

    const result: NormalizedApplicationError = normalizer.normalize(error);

    expect(result.message).toContain('[REDACTED]');
    expect(result.message).not.toContain('abc.def.ghi');
    expect(result.message).not.toContain('token-secreto');
    expect(result.message).not.toContain('password-secreto');
  });

  it('limita el tamaño de los mensajes normalizados', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const error: Error = new Error('x'.repeat(10_000));

    const result: NormalizedApplicationError = normalizer.normalize(error);

    expect(result.message).toHaveLength(4_096);
    expect(result.message.endsWith('…')).toBe(true);
  });

  it('limita la profundidad de causas encadenadas', (): void => {
    const normalizer: ApplicationErrorNormalizer = new ApplicationErrorNormalizer();

    const levelFive: Error = new Error('Nivel 5.');
    const levelFour: Error = new Error('Nivel 4.', {
      cause: levelFive,
    });
    const levelThree: Error = new Error('Nivel 3.', {
      cause: levelFour,
    });
    const levelTwo: Error = new Error('Nivel 2.', {
      cause: levelThree,
    });
    const levelOne: Error = new Error('Nivel 1.', {
      cause: levelTwo,
    });

    const result: NormalizedApplicationError = normalizer.normalize(levelOne);

    expect(result.cause?.message).toBe('Nivel 2.');
    expect(result.cause?.cause?.message).toBe('Nivel 3.');
    expect(result.cause?.cause?.cause?.message).toBe('Nivel 4.');
    expect(result.cause?.cause?.cause?.cause?.message).toBe('Nivel 5.');
    expect(result.cause?.cause?.cause?.cause?.cause).toBeNull();
  });
});
