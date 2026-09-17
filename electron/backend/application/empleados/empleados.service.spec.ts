import EmpleadosService from '@backend/application/empleados/empleados.service';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type LegacyPasswordVerifier from '@backend/contracts/security/legacy-password-verifier.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import { beforeEach, describe, expect, it } from 'vitest';

class FakeEmpleadoRepository implements EmpleadoRepository {
  empleados: readonly EmpleadoRecord[] = [];

  authenticationRecord: EmpleadoAuthenticationRecord | null = null;

  readonly authenticationRequests: number[] = [];

  readonly upgrades: {
    readonly idEmpleado: number;
    readonly expectedLegacyHash: string;
    readonly newScryptHash: string;
  }[] = [];

  /**
   * Devuelve los empleados configurados para el test.
   */
  findAll(): Promise<readonly EmpleadoRecord[]> {
    return Promise.resolve(this.empleados);
  }

  /**
   * Devuelve las credenciales configuradas para el empleado.
   */
  findAuthenticationById(idEmpleado: number): Promise<EmpleadoAuthenticationRecord | null> {
    this.authenticationRequests.push(idEmpleado);

    return Promise.resolve(this.authenticationRecord);
  }

  /**
   * Registra una migración de contraseña legacy.
   */
  upgradeLegacyPassword(
    idEmpleado: number,
    expectedLegacyHash: string,
    newScryptHash: string,
  ): Promise<void> {
    this.upgrades.push({
      idEmpleado,
      expectedLegacyHash,
      newScryptHash,
    });

    return Promise.resolve();
  }
}

class FakePasswordHasher implements PasswordHasher {
  hashResult = 'scrypt-hash-nuevo';

  verifyResult = true;

  readonly hashRequests: string[] = [];

  readonly verifyRequests: {
    readonly password: string;
    readonly encodedHash: string;
  }[] = [];

  /**
   * Genera el hash configurado para el test.
   */
  hash(password: string): Promise<string> {
    this.hashRequests.push(password);

    return Promise.resolve(this.hashResult);
  }

  /**
   * Comprueba una contraseña scrypt simulada.
   */
  verify(password: string, encodedHash: string): Promise<boolean> {
    this.verifyRequests.push({
      password,
      encodedHash,
    });

    return Promise.resolve(this.verifyResult);
  }
}

class FakeLegacyPasswordVerifier implements LegacyPasswordVerifier {
  verifyResult = true;

  readonly verifyRequests: {
    readonly password: string;
    readonly encodedHash: string;
  }[] = [];

  /**
   * Comprueba una contraseña bcrypt legacy simulada.
   */
  verify(password: string, encodedHash: string): Promise<boolean> {
    this.verifyRequests.push({
      password,
      encodedHash,
    });

    return Promise.resolve(this.verifyResult);
  }
}

let repository: FakeEmpleadoRepository;
let passwordHasher: FakePasswordHasher;
let legacyPasswordVerifier: FakeLegacyPasswordVerifier;
let service: EmpleadosService;

describe('EmpleadosService', (): void => {
  beforeEach((): void => {
    repository = new FakeEmpleadoRepository();
    passwordHasher = new FakePasswordHasher();
    legacyPasswordVerifier = new FakeLegacyPasswordVerifier();

    service = new EmpleadosService(repository, passwordHasher, legacyPasswordVerifier);
  });

  it('devuelve los empleados activos transformados al contrato público', async (): Promise<void> => {
    repository.empleados = [
      createEmpleadoRecord(),
      createEmpleadoRecord({
        id: 2,
        publicId: 'empleado-2',
        nombre: 'Ane',
        hasPassword: false,
        color: '00FF00',
        admin: false,
        permisos: [18, 19],
      }),
    ];

    const result: readonly EmpleadoInterface[] = await service.getAll();

    expect(result).toEqual([
      {
        id: 1,
        publicId: 'empleado-1',
        nombre: 'Iñigo',
        hasPassword: true,
        color: '#FF0000',
        admin: true,
        permisos: [18, 20],
      },
      {
        id: 2,
        publicId: 'empleado-2',
        nombre: 'Ane',
        hasPassword: false,
        color: '#00FF00',
        admin: false,
        permisos: [18, 19],
      },
    ]);
  });

  it('autentica correctamente una contraseña scrypt', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord({
      passwordHash: 'scrypt-hash-existente',
      passwordAlgorithm: 'scrypt',
    });

    passwordHasher.verifyResult = true;

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: 'secreto',
      }),
    ).resolves.toEqual({
      status: 'authenticated',
    });

    expect(passwordHasher.verifyRequests).toEqual([
      {
        password: 'secreto',
        encodedHash: 'scrypt-hash-existente',
      },
    ]);

    expect(legacyPasswordVerifier.verifyRequests).toHaveLength(0);
    expect(passwordHasher.hashRequests).toHaveLength(0);
    expect(repository.upgrades).toHaveLength(0);
  });

  it('rechaza una contraseña scrypt incorrecta', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord({
      passwordAlgorithm: 'scrypt',
    });

    passwordHasher.verifyResult = false;

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: 'incorrecta',
      }),
    ).resolves.toEqual({
      status: 'invalid_password',
    });

    expect(passwordHasher.verifyRequests).toHaveLength(1);
    expect(repository.upgrades).toHaveLength(0);
  });

  it('autentica bcrypt legacy y migra la contraseña a scrypt', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord({
      passwordHash: '$2b$12$hash-legacy',
      passwordAlgorithm: 'bcrypt_legacy',
    });

    legacyPasswordVerifier.verifyResult = true;
    passwordHasher.hashResult = 'nuevo-hash-scrypt';

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: 'secreto',
      }),
    ).resolves.toEqual({
      status: 'authenticated',
    });

    expect(legacyPasswordVerifier.verifyRequests).toEqual([
      {
        password: 'secreto',
        encodedHash: '$2b$12$hash-legacy',
      },
    ]);

    expect(passwordHasher.verifyRequests).toHaveLength(0);

    expect(passwordHasher.hashRequests).toEqual(['secreto']);

    expect(repository.upgrades).toEqual([
      {
        idEmpleado: 1,
        expectedLegacyHash: '$2b$12$hash-legacy',
        newScryptHash: 'nuevo-hash-scrypt',
      },
    ]);
  });

  it('no migra una contraseña bcrypt legacy incorrecta', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord({
      passwordHash: '$2b$12$hash-legacy',
      passwordAlgorithm: 'bcrypt_legacy',
    });

    legacyPasswordVerifier.verifyResult = false;

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: 'incorrecta',
      }),
    ).resolves.toEqual({
      status: 'invalid_password',
    });

    expect(legacyPasswordVerifier.verifyRequests).toHaveLength(1);

    expect(passwordHasher.hashRequests).toHaveLength(0);
    expect(repository.upgrades).toHaveLength(0);
  });

  it('rechaza un empleado cuya contraseña legacy no está disponible', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord({
      passwordAlgorithm: 'bcrypt_legacy',
      passwordAvailable: false,
    });

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: 'secreto',
      }),
    ).resolves.toEqual({
      status: 'password_unavailable',
    });

    expect(passwordHasher.verifyRequests).toHaveLength(0);

    expect(legacyPasswordVerifier.verifyRequests).toHaveLength(0);

    expect(passwordHasher.hashRequests).toHaveLength(0);
    expect(repository.upgrades).toHaveLength(0);
  });

  it('devuelve employee_unavailable si el empleado no está disponible', async (): Promise<void> => {
    repository.authenticationRecord = null;

    await expect(
      service.authenticate({
        idEmpleado: 99,
        password: 'secreto',
      }),
    ).resolves.toEqual({
      status: 'employee_unavailable',
    });

    expect(repository.authenticationRequests).toEqual([99]);

    expect(passwordHasher.verifyRequests).toHaveLength(0);

    expect(legacyPasswordVerifier.verifyRequests).toHaveLength(0);
  });

  it('rechaza una contraseña vacía sin ejecutar el hasher', async (): Promise<void> => {
    repository.authenticationRecord = createAuthenticationRecord();

    await expect(
      service.authenticate({
        idEmpleado: 1,
        password: '',
      }),
    ).resolves.toEqual({
      status: 'invalid_password',
    });

    expect(passwordHasher.verifyRequests).toHaveLength(0);

    expect(legacyPasswordVerifier.verifyRequests).toHaveLength(0);
  });

  it('rechaza un identificador de empleado inválido antes de consultar el repository', async (): Promise<void> => {
    await expect(
      service.authenticate({
        idEmpleado: 0,
        password: 'secreto',
      }),
    ).rejects.toThrow('El empleado seleccionado no es válido.');

    expect(repository.authenticationRequests).toHaveLength(0);
  });
});

/**
 * Crea un empleado interno para los tests.
 */
function createEmpleadoRecord(overrides: Partial<EmpleadoRecord> = {}): EmpleadoRecord {
  return {
    id: 1,
    publicId: 'empleado-1',
    nombre: 'Iñigo',
    hasPassword: true,
    color: 'FF0000',
    admin: true,
    permisos: [18, 20],
    ...overrides,
  };
}

/**
 * Crea las credenciales internas de un empleado.
 */
function createAuthenticationRecord(
  overrides: Partial<EmpleadoAuthenticationRecord> = {},
): EmpleadoAuthenticationRecord {
  return {
    id: 1,
    passwordHash: 'hash-actual',
    passwordAlgorithm: 'scrypt',
    passwordAvailable: true,
    ...overrides,
  };
}
