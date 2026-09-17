import EmpleadosService from '@backend/application/empleados/empleados.service';
import type ActualizarEmpleadoRecordCommand from '@backend/contracts/empleados/actualizar-empleado-record-command.interface';
import type CrearEmpleadoRecordCommand from '@backend/contracts/empleados/crear-empleado-record-command.interface';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type LegacyPasswordVerifier from '@backend/contracts/security/legacy-password-verifier.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type EmpleadoAuthenticationRecord from '@backend/domain/empleados/empleado-authentication-record.interface';
import type EmpleadoRecord from '@backend/domain/empleados/empleado-record.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import { beforeEach, describe, expect, it } from 'vitest';

class FakeEmpleadoRepository implements EmpleadoRepository {
  empleados: readonly EmpleadoRecord[] = [];

  findByIdResult: EmpleadoRecord | null = null;

  existsActiveByNameResult = false;

  activeAdminCount = 1;

  createdEmpleado: EmpleadoRecord = createEmpleadoRecord({
    id: 2,
    publicId: 'empleado-creado',
    admin: false,
  });

  updatedEmpleado: EmpleadoRecord = createEmpleadoRecord();

  authenticationRecord: EmpleadoAuthenticationRecord | null = null;

  readonly findByIdRequests: number[] = [];

  readonly existsActiveByNameRequests: {
    readonly nombre: string;
    readonly excludeId: number | null;
  }[] = [];

  readonly createRequests: CrearEmpleadoRecordCommand[] = [];

  readonly updateRequests: {
    readonly idEmpleado: number;
    readonly command: ActualizarEmpleadoRecordCommand;
  }[] = [];

  readonly deactivateRequests: number[] = [];

  readonly authenticationRequests: number[] = [];

  readonly upgrades: {
    readonly idEmpleado: number;
    readonly expectedLegacyHash: string;
    readonly newScryptHash: string;
  }[] = [];

  /**
   * Devuelve los empleados configurados
   * para el test.
   */
  findAll(): Promise<readonly EmpleadoRecord[]> {
    return Promise.resolve(this.empleados);
  }

  /**
   * Devuelve el empleado configurado
   * para una búsqueda por id.
   */
  findById(idEmpleado: number): Promise<EmpleadoRecord | null> {
    this.findByIdRequests.push(idEmpleado);

    return Promise.resolve(this.findByIdResult);
  }

  /**
   * Simula la comprobación de nombre
   * duplicado.
   */
  existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean> {
    this.existsActiveByNameRequests.push({
      nombre,
      excludeId,
    });

    return Promise.resolve(this.existsActiveByNameResult);
  }

  /**
   * Devuelve el número de administradores
   * activos configurado para el test.
   */
  countActiveAdmins(): Promise<number> {
    return Promise.resolve(this.activeAdminCount);
  }

  /**
   * Registra la creación de un empleado.
   */
  create(command: CrearEmpleadoRecordCommand): Promise<EmpleadoRecord> {
    this.createRequests.push(command);

    return Promise.resolve(this.createdEmpleado);
  }

  /**
   * Registra la actualización
   * de un empleado.
   */
  update(idEmpleado: number, command: ActualizarEmpleadoRecordCommand): Promise<EmpleadoRecord> {
    this.updateRequests.push({
      idEmpleado,
      command,
    });

    return Promise.resolve(this.updatedEmpleado);
  }

  /**
   * Registra la baja lógica
   * de un empleado.
   */
  deactivate(idEmpleado: number): Promise<void> {
    this.deactivateRequests.push(idEmpleado);

    return Promise.resolve();
  }

  /**
   * Devuelve las credenciales configuradas
   * para el empleado.
   */
  findAuthenticationById(idEmpleado: number): Promise<EmpleadoAuthenticationRecord | null> {
    this.authenticationRequests.push(idEmpleado);

    return Promise.resolve(this.authenticationRecord);
  }

  /**
   * Registra una migración
   * de contraseña legacy.
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

  it('crea un empleado con contraseña normalizando sus datos', async (): Promise<void> => {
    passwordHasher.hashResult = 'nuevo-hash';

    repository.createdEmpleado = createEmpleadoRecord({
      id: 2,
      publicId: 'empleado-2',
      nombre: 'Ane',
      hasPassword: true,
      color: '12ABEF',
      admin: false,
      permisos: [18, 20],
    });

    const result: EmpleadoInterface = await service.create({
      nombre: '  Ane  ',
      hasPassword: true,
      password: 'secreto',
      color: '#12abEF',
      permisos: [20, 18, 20],
    });

    expect(passwordHasher.hashRequests).toEqual(['secreto']);

    expect(repository.existsActiveByNameRequests).toEqual([
      {
        nombre: 'Ane',
        excludeId: null,
      },
    ]);

    expect(repository.createRequests).toEqual([
      {
        nombre: 'Ane',
        passwordHash: 'nuevo-hash',
        color: '12ABEF',
        permisos: [18, 20],
      },
    ]);

    expect(result).toEqual({
      id: 2,
      publicId: 'empleado-2',
      nombre: 'Ane',
      hasPassword: true,
      color: '#12ABEF',
      admin: false,
      permisos: [18, 20],
    });
  });

  it('crea un empleado sin contraseña', async (): Promise<void> => {
    repository.createdEmpleado = createEmpleadoRecord({
      id: 2,
      publicId: 'empleado-2',
      nombre: 'Ane',
      hasPassword: false,
      color: '00FF00',
      admin: false,
      permisos: [],
    });

    await service.create({
      nombre: 'Ane',
      hasPassword: false,
      password: null,
      color: '#00FF00',
      permisos: [],
    });

    expect(passwordHasher.hashRequests).toHaveLength(0);

    expect(repository.createRequests).toEqual([
      {
        nombre: 'Ane',
        passwordHash: null,
        color: '00FF00',
        permisos: [],
      },
    ]);
  });

  it('rechaza crear un empleado con nombre duplicado', async (): Promise<void> => {
    repository.existsActiveByNameResult = true;

    await expect(
      service.create({
        nombre: 'Ane',
        hasPassword: true,
        password: 'secreto',
        color: '#00FF00',
        permisos: [],
      }),
    ).rejects.toThrow('Ya existe un empleado con ese nombre.');

    expect(passwordHasher.hashRequests).toHaveLength(0);

    expect(repository.createRequests).toHaveLength(0);
  });

  it('actualiza un empleado conservando su contraseña actual', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: false,
      hasPassword: true,
    });

    repository.updatedEmpleado = createEmpleadoRecord({
      nombre: 'Nombre nuevo',
      color: 'ABCDEF',
      admin: false,
      permisos: [18, 21],
    });

    const result: EmpleadoInterface = await service.update(1, {
      nombre: '  Nombre nuevo  ',
      hasPassword: true,
      password: null,
      color: '#abcdef',
      permisos: [21, 18, 21],
    });

    expect(passwordHasher.hashRequests).toHaveLength(0);

    expect(repository.updateRequests).toEqual([
      {
        idEmpleado: 1,
        command: {
          nombre: 'Nombre nuevo',
          hasPassword: true,
          passwordHash: null,
          color: 'ABCDEF',
          permisos: [18, 21],
        },
      },
    ]);

    expect(result.nombre).toBe('Nombre nuevo');

    expect(result.color).toBe('#ABCDEF');
  });

  it('exige una nueva contraseña al activarla en un empleado que no tenía', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: false,
      hasPassword: false,
    });

    await expect(
      service.update(1, {
        nombre: 'Ane',
        hasPassword: true,
        password: null,
        color: '#00FF00',
        permisos: [],
      }),
    ).rejects.toThrow('Debes indicar una contraseña al activarla para este empleado.');

    expect(repository.updateRequests).toHaveLength(0);
  });

  it('permite establecer una nueva contraseña a un empleado', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: false,
      hasPassword: false,
    });

    passwordHasher.hashResult = 'nuevo-hash';

    repository.updatedEmpleado = createEmpleadoRecord({
      admin: false,
      hasPassword: true,
    });

    await service.update(1, {
      nombre: 'Iñigo',
      hasPassword: true,
      password: 'nuevo-secreto',
      color: '#FF0000',
      permisos: [18],
    });

    expect(passwordHasher.hashRequests).toEqual(['nuevo-secreto']);

    expect(repository.updateRequests[0]?.command.passwordHash).toBe('nuevo-hash');
  });

  it('permite quitar la contraseña a un empleado no administrador', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: false,
      hasPassword: true,
    });

    repository.updatedEmpleado = createEmpleadoRecord({
      admin: false,
      hasPassword: false,
    });

    await service.update(1, {
      nombre: 'Iñigo',
      hasPassword: false,
      password: null,
      color: '#FF0000',
      permisos: [],
    });

    expect(repository.updateRequests).toEqual([
      {
        idEmpleado: 1,
        command: {
          nombre: 'Iñigo',
          hasPassword: false,
          passwordHash: null,
          color: 'FF0000',
          permisos: [],
        },
      },
    ]);
  });

  it('impide quitar la contraseña a un administrador', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: true,
      hasPassword: true,
    });

    await expect(
      service.update(1, {
        nombre: 'Iñigo',
        hasPassword: false,
        password: null,
        color: '#FF0000',
        permisos: [],
      }),
    ).rejects.toThrow('Un empleado administrador debe tener contraseña.');

    expect(repository.updateRequests).toHaveLength(0);
  });

  it('rechaza actualizar un empleado inexistente', async (): Promise<void> => {
    repository.findByIdResult = null;

    await expect(
      service.update(99, {
        nombre: 'Ane',
        hasPassword: false,
        password: null,
        color: '#00FF00',
        permisos: [],
      }),
    ).rejects.toThrow('El empleado indicado no existe.');

    expect(repository.updateRequests).toHaveLength(0);
  });

  it('impide eliminar el último administrador activo', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: true,
    });

    repository.activeAdminCount = 1;

    await expect(service.deactivate(1)).rejects.toThrow(
      'No se puede eliminar el último administrador de la aplicación.',
    );

    expect(repository.deactivateRequests).toHaveLength(0);
  });

  it('permite eliminar un administrador cuando existe otro activo', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: true,
    });

    repository.activeAdminCount = 2;

    await service.deactivate(1);

    expect(repository.deactivateRequests).toEqual([1]);
  });

  it('permite eliminar un empleado no administrador', async (): Promise<void> => {
    repository.findByIdResult = createEmpleadoRecord({
      admin: false,
    });

    await service.deactivate(1);

    expect(repository.deactivateRequests).toEqual([1]);
  });

  it('rechaza eliminar un empleado inexistente', async (): Promise<void> => {
    repository.findByIdResult = null;

    await expect(service.deactivate(99)).rejects.toThrow('El empleado indicado no existe.');

    expect(repository.deactivateRequests).toHaveLength(0);
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
