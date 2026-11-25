import writeAtomicTextFile from '@infrastructure/filesystem/write-atomic-text-file';
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    rename: vi.fn(actual.rename),
  };
});

let tempDirectory: string | null = null;

describe('writeAtomicTextFile', (): void => {
  beforeEach(async (): Promise<void> => {
    vi.mocked(rename).mockReset();
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-atomic-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('guarda el contenido y elimina su temporal', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeAtomicTextFile(filePath, '{"version":1}\n');

    await expect(readFile(filePath, 'utf8')).resolves.toBe('{"version":1}\n');

    const files: string[] = await readdir(directory);

    expect(files).toEqual(['config.json']);
  });

  it('sustituye el contenido anterior', async (): Promise<void> => {
    const filePath: string = join(requireTempDirectory(), 'config.json');

    await writeAtomicTextFile(filePath, 'anterior');
    await writeAtomicTextFile(filePath, 'nuevo');

    await expect(readFile(filePath, 'utf8')).resolves.toBe('nuevo');
  });

  it('no altera un temporal preexistente de otra operación', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');
    const existingTemporaryPath: string = `${filePath}.tmp`;

    await writeFile(existingTemporaryPath, 'temporal-existente');

    await writeAtomicTextFile(filePath, 'contenido-definitivo');

    await expect(readFile(filePath, 'utf8')).resolves.toBe('contenido-definitivo');

    await expect(readFile(existingTemporaryPath, 'utf8')).resolves.toBe('temporal-existente');
  });

  it('permite escrituras concurrentes sin mezclar contenidos', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    const firstContent: string = 'A'.repeat(10_000);
    const secondContent: string = 'B'.repeat(10_000);

    await Promise.all([
      writeAtomicTextFile(filePath, firstContent),
      writeAtomicTextFile(filePath, secondContent),
    ]);

    const content: string = await readFile(filePath, 'utf8');

    expect(content).toBe(secondContent);

    const files: string[] = await readdir(directory);

    expect(files).toEqual(['config.json']);
  });

  it('conserva el destino anterior si falla la promoción', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeFile(filePath, 'contenido-original');

    // Una ruta inexistente como destino impide la
    // promoción del temporal al fichero solicitado.
    const invalidPath: string = join(directory, 'missing', 'config.json');

    await expect(writeAtomicTextFile(invalidPath, 'nuevo')).rejects.toThrow();

    await expect(readFile(filePath, 'utf8')).resolves.toBe('contenido-original');

    const files: string[] = await readdir(directory);

    expect(files).toEqual(['config.json']);
  });

  it('permite recuperarse después de un error de escritura', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeAtomicTextFile(filePath, 'primera-version');

    await expect(
      writeAtomicTextFile(join(directory, 'missing', 'config.json'), 'fallo'),
    ).rejects.toThrow();

    await writeAtomicTextFile(filePath, 'segunda-version');

    await expect(readFile(filePath, 'utf8')).resolves.toBe('segunda-version');

    const files: string[] = await readdir(directory);

    expect(files).toEqual(['config.json']);
  });

  it('reintenta un bloqueo temporal durante la promoción', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeFile(filePath, 'contenido-original');

    const error: Error = Object.assign(new Error('Bloqueo temporal'), { code: 'EPERM' });

    vi.mocked(rename).mockRejectedValueOnce(error);

    await writeAtomicTextFile(filePath, 'contenido-nuevo');

    expect(rename).toHaveBeenCalledTimes(2);

    await expect(readFile(filePath, 'utf8')).resolves.toBe('contenido-nuevo');

    expect(await readdir(directory)).toEqual(['config.json']);
  });

  it('limita los reintentos y conserva el contenido anterior', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeFile(filePath, 'contenido-original');

    const error: Error = Object.assign(new Error('Bloqueo persistente'), { code: 'EPERM' });

    vi.mocked(rename).mockRejectedValue(error);

    await expect(writeAtomicTextFile(filePath, 'contenido-nuevo')).rejects.toBe(error);

    expect(rename).toHaveBeenCalledTimes(6);

    await expect(readFile(filePath, 'utf8')).resolves.toBe('contenido-original');

    expect(await readdir(directory)).toEqual(['config.json']);
  });

  it('no reintenta errores ajenos a bloqueos temporales', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    await writeFile(filePath, 'contenido-original');

    const error: Error = Object.assign(new Error('Error de entrada y salida'), { code: 'EIO' });

    vi.mocked(rename).mockRejectedValueOnce(error);

    await expect(writeAtomicTextFile(filePath, 'contenido-nuevo')).rejects.toBe(error);

    expect(rename).toHaveBeenCalledTimes(1);

    await expect(readFile(filePath, 'utf8')).resolves.toBe('contenido-original');

    expect(await readdir(directory)).toEqual(['config.json']);
  });

  it('continúa las escrituras encoladas aunque falle la anterior', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const filePath: string = join(directory, 'config.json');

    const error: Error = Object.assign(new Error('Error de promoción'), { code: 'EIO' });

    vi.mocked(rename).mockRejectedValueOnce(error);

    const results = await Promise.allSettled([
      writeAtomicTextFile(filePath, 'primera-escritura'),
      writeAtomicTextFile(filePath, 'segunda-escritura'),
    ]);

    expect(results[0]).toEqual({
      status: 'rejected',
      reason: error,
    });

    expect(results[1]).toEqual({
      status: 'fulfilled',
      value: undefined,
    });

    await expect(readFile(filePath, 'utf8')).resolves.toBe('segunda-escritura');

    expect(await readdir(directory)).toEqual(['config.json']);
  });
});

/**
 * Recupera el directorio temporal del test.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return tempDirectory;
}
