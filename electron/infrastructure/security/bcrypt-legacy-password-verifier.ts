import type LegacyPasswordVerifier from '@backend/contracts/security/legacy-password-verifier.interface';
import { compare } from 'bcryptjs';

export default class BcryptLegacyPasswordVerifier implements LegacyPasswordVerifier {
  /**
   * Comprueba una contraseña bcrypt legacy.
   */
  async verify(password: string, encodedHash: string): Promise<boolean> {
    try {
      return await compare(password, this.normalizeHash(encodedHash));
    } catch {
      return false;
    }
  }

  /**
   * Convierte el prefijo $2y$ utilizado por algunas
   * implementaciones PHP al equivalente $2b$.
   */
  private normalizeHash(encodedHash: string): string {
    if (encodedHash.startsWith('$2y$')) {
      return `$2b$${encodedHash.slice(4)}`;
    }

    return encodedHash;
  }
}
