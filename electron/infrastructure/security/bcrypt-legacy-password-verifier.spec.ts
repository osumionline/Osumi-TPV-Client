import BcryptLegacyPasswordVerifier from '@infrastructure/security/bcrypt-legacy-password-verifier';
import { hash } from 'bcryptjs';
import { describe, expect, it } from 'vitest';

describe('BcryptLegacyPasswordVerifier', (): void => {
  const verifier = new BcryptLegacyPasswordVerifier();

  it('acepta una contraseña bcrypt válida', async (): Promise<void> => {
    const encodedHash: string = await hash('secreto', 4);

    await expect(verifier.verify('secreto', encodedHash)).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async (): Promise<void> => {
    const encodedHash: string = await hash('secreto', 4);

    await expect(verifier.verify('incorrecta', encodedHash)).resolves.toBe(false);
  });

  it('acepta hashes legacy con prefijo $2y$', async (): Promise<void> => {
    const encodedHash: string = await hash('secreto', 4);
    const legacyHash: string = encodedHash.replace(/^\$2b\$/, '$2y$');

    await expect(verifier.verify('secreto', legacyHash)).resolves.toBe(true);
  });

  it('rechaza hashes malformados sin propagar errores', async (): Promise<void> => {
    await expect(verifier.verify('secreto', 'hash-no-valido')).resolves.toBe(false);
  });
});
