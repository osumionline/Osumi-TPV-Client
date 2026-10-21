import writeAtomicTextFile from '@infrastructure/filesystem/write-atomic-text-file';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('writeAtomicTextFile', (): void => {
  beforeEach(async (): Promise<void> => {
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

    expect([firstContent, secondContent]).toContain(content);

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
