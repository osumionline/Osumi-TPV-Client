import ClientesService from '@backend/application/clientes/clientes.service';
import type {
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteRepository implements ClienteRepository {
  createdCommand: CrearClienteRecordCommand | null = null;

  /**
   * Devuelve una colección vacía para las pruebas del servicio.
   */
  findAll(): Promise<readonly ClienteRecord[]> {
    return Promise.resolve([]);
  }

  /**
   * Simula que no existen clientes con el DNI/CIF consultado.
   */
  existsActiveByDniCif(): Promise<boolean> {
    return Promise.resolve(false);
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
