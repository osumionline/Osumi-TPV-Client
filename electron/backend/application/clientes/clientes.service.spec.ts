import ClientesService from '@backend/application/clientes/clientes.service';
import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteRepository implements ClienteRepository {
  createdCommand: CrearClienteRecordCommand | null = null;
  updatedPublicId: string | null = null;
  updatedCommand: CrearClienteRecordCommand | null = null;
  checkedDniCif: string | null = null;
  excludedPublicId: string | null = null;
  dniCifExists: boolean = false;
  updateAvailable: boolean = true;
  deactivatedPublicId: string | null = null;
  deactivateResult: ClienteDeactivateResult = 'deactivated';

  /**
   * Devuelve una colección vacía para las pruebas del servicio.
   */
  findAll(): Promise<readonly ClienteRecord[]> {
    return Promise.resolve([]);
  }

  /**
   * Simula la comprobación de unicidad del DNI/CIF.
   */
  existsActiveByDniCif(dniCif: string, excludedPublicId: string | null): Promise<boolean> {
    this.checkedDniCif = dniCif;
    this.excludedPublicId = excludedPublicId;

    return Promise.resolve(this.dniCifExists);
  }

  /**
   * Registra el comando y devuelve el cliente simulado ya persistido.
   */
  create(command: CrearClienteRecordCommand): Promise<ClienteRecord> {
    this.createdCommand = command;

    return Promise.resolve({
      id: 1,
      publicId: 'cliente-1',
      ...command,
      ultimaVenta: null,
    });
  }

  /**
   * Registra una actualización y devuelve el cliente persistido simulado.
   */
  update(publicId: string, command: CrearClienteRecordCommand): Promise<ClienteRecord | null> {
    this.updatedPublicId = publicId;
    this.updatedCommand = command;

    if (!this.updateAvailable) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: 1,
      publicId,
      ...command,
      ultimaVenta: null,
    });
  }

  /**
   * Simula la baja lógica de un cliente.
   */
  deactivate(publicId: string): Promise<ClienteDeactivateResult> {
    this.deactivatedPublicId = publicId;

    return Promise.resolve(this.deactivateResult);
  }

  /**
   * Devuelve una colección vacía de últimas ventas.
   */
  findUltimasVentas(): Promise<readonly ClienteUltimaVentaRecord[]> {
    return Promise.resolve([]);
  }

  /**
   * Devuelve una colección vacía de artículos más comprados.
   */
  findTopVentas(): Promise<readonly ClienteTopVentaRecord[]> {
    return Promise.resolve([]);
  }
}

describe('ClientesService', (): void => {
  it('conserva los datos alternativos aunque la facturación use los generales', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    const cliente: ClienteInterface = await service.create(
      createCommand({
        factIgual: true,
        factNombreApellidos: '  Analytical Engines SL  ',
        factDniCif: '  B12345678  ',
        factTelefono: '  944000000  ',
        factEmail: '  billing@example.com  ',
        factDireccion: '  Calle Mayor 1  ',
        factCodigoPostal: '  48001  ',
        factPoblacion: '  Bilbao  ',
        factProvincia: 48,
      }),
    );

    expect(repository.createdCommand).toMatchObject({
      factIgual: true,
      factNombreApellidos: 'Analytical Engines SL',
      factDniCif: 'B12345678',
      factTelefono: '944000000',
      factEmail: 'billing@example.com',
      factDireccion: 'Calle Mayor 1',
      factCodigoPostal: '48001',
      factPoblacion: 'Bilbao',
      factProvincia: 48,
    });

    expect(cliente).toMatchObject({
      factIgual: true,
      factNombreApellidos: 'Analytical Engines SL',
      factDniCif: 'B12345678',
      factTelefono: '944000000',
      factEmail: 'billing@example.com',
      factDireccion: 'Calle Mayor 1',
      factCodigoPostal: '48001',
      factPoblacion: 'Bilbao',
      factProvincia: 48,
    });
  });

  it('no valida el formato de un dato alternativo mientras permanece oculto', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    const cliente: ClienteInterface = await service.create(
      createCommand({
        factIgual: true,
        factEmail: '  email-legacy-no-valido  ',
      }),
    );

    expect(repository.createdCommand?.factEmail).toBe('email-legacy-no-valido');
    expect(cliente.factEmail).toBe('email-legacy-no-valido');
  });

  it('valida los datos alternativos cuando se utilizan para facturar', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    await expect(
      service.create(
        createCommand({
          factIgual: false,
          factEmail: 'email-no-valido',
        }),
      ),
    ).rejects.toThrow('El email de facturación indicado no tiene un formato válido.');

    expect(repository.createdCommand).toBeNull();
  });

  it('actualiza un cliente sin considerar duplicado su propio DNI/CIF', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    const cliente: ClienteInterface = await service.update(
      createUpdateCommand({
        publicId: '  cliente-1  ',
        nombreApellidos: '  Ada Byron  ',
        dniCif: '  12345678A  ',
        telefono: '  944000000  ',
      }),
    );

    expect(repository.excludedPublicId).toBe('cliente-1');
    expect(repository.checkedDniCif).toBe('12345678A');
    expect(repository.updatedPublicId).toBe('cliente-1');
    expect(repository.updatedCommand).toMatchObject({
      nombreApellidos: 'Ada Byron',
      dniCif: '12345678A',
      telefono: '944000000',
    });
    expect(cliente).toMatchObject({
      id: 1,
      publicId: 'cliente-1',
      nombreApellidos: 'Ada Byron',
      dniCif: '12345678A',
    });
  });

  it('rechaza actualizar con el DNI/CIF de otro cliente activo', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.dniCifExists = true;

    await expect(
      service.update(
        createUpdateCommand({
          dniCif: '12345678A',
        }),
      ),
    ).rejects.toThrow('Ya existe un cliente activo con ese DNI/CIF.');

    expect(repository.updatedCommand).toBeNull();
  });

  it('rechaza actualizar un cliente inexistente o dado de baja', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.updateAvailable = false;

    await expect(service.update(createUpdateCommand())).rejects.toThrow(
      'El cliente indicado no existe o ya no está activo.',
    );
  });

  it('rechaza actualizar sin un publicId válido', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    await expect(
      service.update(
        createUpdateCommand({
          publicId: '   ',
        }),
      ),
    ).rejects.toThrow('El identificador del cliente no es válido.');

    expect(repository.updatedCommand).toBeNull();
  });

  it('normaliza el publicId antes de dar de baja el cliente', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    await service.deactivate('  cliente-1  ');

    expect(repository.deactivatedPublicId).toBe('cliente-1');
  });

  it('rechaza la baja cuando el cliente tiene facturas en borrador', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.deactivateResult = 'has_draft_invoices';

    await expect(service.deactivate('cliente-1')).rejects.toThrow(
      'No se puede dar de baja el cliente porque tiene facturas en borrador.',
    );
  });

  it('rechaza la baja de un cliente inexistente o inactivo', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.deactivateResult = 'not_found';

    await expect(service.deactivate('cliente-1')).rejects.toThrow(
      'El cliente indicado no existe o ya no está activo.',
    );
  });

  it('rechaza la baja sin un publicId válido', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    await expect(service.deactivate('   ')).rejects.toThrow(
      'El identificador del cliente no es válido.',
    );

    expect(repository.deactivatedPublicId).toBeNull();
  });
});

/**
 * Crea un comando válido y permite sobrescribir los campos relevantes para cada prueba.
 */
function createCommand(overrides: Partial<CrearClienteCommand> = {}): CrearClienteCommand {
  return {
    nombreApellidos: 'Ada Lovelace',
    dniCif: null,
    telefono: null,
    email: null,
    direccion: null,
    codigoPostal: null,
    poblacion: null,
    provincia: null,
    factIgual: true,
    factNombreApellidos: null,
    factDniCif: null,
    factTelefono: null,
    factEmail: null,
    factDireccion: null,
    factCodigoPostal: null,
    factPoblacion: null,
    factProvincia: null,
    observaciones: null,
    descuento: 0,
    ...overrides,
  };
}

/**
 * Crea un comando válido de actualización para las pruebas.
 */
function createUpdateCommand(
  overrides: Partial<ActualizarClienteCommand> = {},
): ActualizarClienteCommand {
  return {
    ...createCommand(overrides),
    publicId: 'cliente-1',
    ...overrides,
  };
}
