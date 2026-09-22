import { TestBed } from '@angular/core/testing';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import permissionKeys from '@desktop-contracts/configuration/permissions/permission-keys.constants';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: EmpleadosService;

let originalDesktopDescriptor: PropertyDescriptor | undefined;

let getAllCalls: number;

let authenticateCalls: AutenticarEmpleadoCommand[];

let createCalls: CrearEmpleadoCommand[];

let updateCalls: {
  readonly idEmpleado: number;
  readonly command: ActualizarEmpleadoCommand;
}[];

let deactivateCalls: number[];

let getAllResult: readonly EmpleadoInterface[];

let authenticateResult: AutenticarEmpleadoResult;

let createResult: EmpleadoInterface;

let updateResult: EmpleadoInterface;

describe('EmpleadosService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    getAllCalls = 0;
    authenticateCalls = [];
    createCalls = [];
    updateCalls = [];
    deactivateCalls = [];

    getAllResult = [
      createEmpleadoInterface({
        id: 1,
        publicId: 'empleado-1',
        nombre: 'Iñigo',
        color: '#FF0000',
        admin: true,
        permisos: [permissionKeys.gestion.ajustes, permissionKeys.gestion.empleados],
      }),

      createEmpleadoInterface({
        id: 2,
        publicId: 'empleado-2',
        nombre: 'Amaia',
        color: '#FFAA00',
        admin: false,
        permisos: [permissionKeys.gestion.empleados, permissionKeys.gestion.tiposPago],
      }),
    ];

    authenticateResult = {
      status: 'authenticated',
    };

    createResult = createEmpleadoInterface({
      id: 3,
      publicId: 'empleado-3',
      nombre: 'Zuriñe',
      color: '#00AA00',
      admin: false,
      permisos: [permissionKeys.gestion.empleados],
    });

    updateResult = createEmpleadoInterface({
      id: 1,
      publicId: 'empleado-1',
      nombre: 'Aitor',
      color: '#123456',
      admin: true,
      permisos: [permissionKeys.gestion.empleados, permissionKeys.gestion.tiposPago],
    });

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        empleados: {
          getAll: (): Promise<readonly EmpleadoInterface[]> => {
            getAllCalls++;

            return Promise.resolve(getAllResult);
          },

          authenticate: (command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult> => {
            authenticateCalls.push(command);

            return Promise.resolve(authenticateResult);
          },

          create: (command: CrearEmpleadoCommand): Promise<EmpleadoInterface> => {
            createCalls.push(command);

            return Promise.resolve(createResult);
          },

          update: (
            idEmpleado: number,
            command: ActualizarEmpleadoCommand,
          ): Promise<EmpleadoInterface> => {
            updateCalls.push({
              idEmpleado,
              command,
            });

            return Promise.resolve(updateResult);
          },

          deactivate: (idEmpleado: number): Promise<void> => {
            deactivateCalls.push(idEmpleado);

            return Promise.resolve();
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [EmpleadosService],
    });

    service = TestBed.inject(EmpleadosService);
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('carga los empleados una sola vez y los mantiene ordenados en memoria', async (): Promise<void> => {
    await service.load();
    await service.load();

    expect(getAllCalls).toBe(1);

    expect(service.empleados().map((empleado: Empleado): string => empleado.nombre)).toEqual([
      'Amaia',
      'Iñigo',
    ]);

    expect(service.loaded()).toBe(true);
  });

  it('fuerza una nueva carga al ejecutar reload', async (): Promise<void> => {
    await service.load();
    await service.reload();

    expect(getAllCalls).toBe(2);
  });

  it('delega la autenticación en Electron', async (): Promise<void> => {
    await expect(service.authenticate(2, 'secreto')).resolves.toEqual({
      status: 'authenticated',
    });

    expect(authenticateCalls).toEqual([
      {
        idEmpleado: 2,
        password: 'secreto',
      },
    ]);
  });

  it('añade en memoria el empleado creado sin recargar el listado', async (): Promise<void> => {
    await service.load();

    const empleado: Empleado = await service.create({
      nombre: 'Zuriñe',
      password: 'secreto',
      color: '#00AA00',
      permisos: [permissionKeys.gestion.empleados],
    });

    expect(createCalls).toEqual([
      {
        nombre: 'Zuriñe',
        password: 'secreto',
        color: '#00AA00',
        permisos: [permissionKeys.gestion.empleados],
      },
    ]);

    expect(getAllCalls).toBe(1);

    expect(empleado.id).toBe(3);

    expect(empleado.nombre).toBe('Zuriñe');

    expect(empleado.permisos).toEqual([permissionKeys.gestion.empleados]);

    expect(service.empleados().map((item: Empleado): string => item.nombre)).toEqual([
      'Amaia',
      'Iñigo',
      'Zuriñe',
    ]);
  });

  it('sustituye en memoria el empleado actualizado y reordena el listado', async (): Promise<void> => {
    await service.load();

    const empleado: Empleado = await service.update(1, {
      nombre: 'Aitor',
      password: null,
      color: '#123456',
      permisos: [permissionKeys.gestion.empleados, permissionKeys.gestion.tiposPago],
    });

    expect(updateCalls).toEqual([
      {
        idEmpleado: 1,

        command: {
          nombre: 'Aitor',
          password: null,
          color: '#123456',
          permisos: [permissionKeys.gestion.empleados, permissionKeys.gestion.tiposPago],
        },
      },
    ]);

    expect(empleado.nombre).toBe('Aitor');

    expect(service.findById(1)?.nombre).toBe('Aitor');

    expect(service.findById(1)?.color).toBe('#123456');

    expect(service.findById(1)?.permisos).toEqual([
      permissionKeys.gestion.empleados,
      permissionKeys.gestion.tiposPago,
    ]);

    expect(service.empleados().map((item: Empleado): string => item.nombre)).toEqual([
      'Aitor',
      'Amaia',
    ]);
  });

  it('retira de memoria el empleado dado de baja', async (): Promise<void> => {
    await service.load();

    await service.deactivate(2);

    expect(deactivateCalls).toEqual([2]);

    expect(service.findById(2)).toBeNull();

    expect(service.empleados().map((empleado: Empleado): string => empleado.nombre)).toEqual([
      'Iñigo',
    ]);
  });

  it('busca empleados por id y publicId en la copia en memoria', async (): Promise<void> => {
    await service.load();

    expect(service.findById(2)?.nombre).toBe('Amaia');

    expect(service.findByPublicId('empleado-1')?.nombre).toBe('Iñigo');

    expect(service.findById(999)).toBeNull();

    expect(service.findByPublicId('no-existe')).toBeNull();
  });

  it('limpia completamente el estado en memoria', async (): Promise<void> => {
    await service.load();

    expect(service.loaded()).toBe(true);

    expect(service.empleados()).toHaveLength(2);

    service.clear();

    expect(service.loaded()).toBe(false);

    expect(service.empleados()).toEqual([]);
  });
});

/**
 * Crea un contrato público de empleado
 * para los tests del servicio.
 */
function createEmpleadoInterface(overrides: Partial<EmpleadoInterface> = {}): EmpleadoInterface {
  return {
    id: 1,
    publicId: 'empleado-1',
    nombre: 'Iñigo',
    hasPassword: true,
    color: '#FF0000',
    admin: false,
    permisos: [],
    ...overrides,
  };
}
