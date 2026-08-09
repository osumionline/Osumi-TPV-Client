import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

interface ScryptParameters {
  readonly cost: number;
  readonly blockSize: number;
  readonly parallelization: number;
}

const VERSION: number = 1;
const KEY_LENGTH: number = 64;
const SALT_LENGTH: number = 16;

const DEFAULT_PARAMETERS: ScryptParameters = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
};

export default class NodeScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt: Buffer = randomBytes(SALT_LENGTH);

    const derivedKey: Buffer = await this.deriveKey(password, salt, DEFAULT_PARAMETERS);

    return [
      'scrypt',
      VERSION,
      DEFAULT_PARAMETERS.cost,
      DEFAULT_PARAMETERS.blockSize,
      DEFAULT_PARAMETERS.parallelization,
      salt.toString('base64'),
      derivedKey.toString('base64'),
    ].join('$');
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    const parts: string[] = encodedHash.split('$');

    if (parts.length !== 7 || parts[0] !== 'scrypt') {
      return false;
    }

    const version: number = Number(parts[1]);

    const parameters: ScryptParameters = {
      cost: Number(parts[2]),
      blockSize: Number(parts[3]),
      parallelization: Number(parts[4]),
    };

    if (
      version !== VERSION ||
      !Number.isInteger(parameters.cost) ||
      !Number.isInteger(parameters.blockSize) ||
      !Number.isInteger(parameters.parallelization)
    ) {
      return false;
    }

    const salt: Buffer = Buffer.from(parts[5], 'base64');

    const expectedKey: Buffer = Buffer.from(parts[6], 'base64');

    const actualKey: Buffer = await this.deriveKey(password, salt, parameters);

    if (expectedKey.length !== actualKey.length) {
      return false;
    }

    return timingSafeEqual(expectedKey, actualKey);
  }

  private deriveKey(password: string, salt: Buffer, parameters: ScryptParameters): Promise<Buffer> {
    return new Promise<Buffer>(
      (resolve: (value: Buffer) => void, reject: (reason?: unknown) => void): void => {
        scrypt(
          password,
          salt,
          KEY_LENGTH,
          {
            cost: parameters.cost,
            blockSize: parameters.blockSize,
            parallelization: parameters.parallelization,
            maxmem: 64 * 1024 * 1024,
          },
          (error: Error | null, derivedKey: Buffer): void => {
            if (error !== null) {
              reject(error);

              return;
            }

            resolve(derivedKey);
          },
        );
      },
    );
  }
}
