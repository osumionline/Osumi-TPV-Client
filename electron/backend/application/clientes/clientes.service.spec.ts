import ClientesService from '@backend/application/clientes/clientes.service';
import type ClienteConsumoMensualRepositoryQuery from '@backend/contracts/clientes/cliente-consumo-mensual-query.interface';
import type ClienteDeactivateResult from '@backend/contracts/clientes/cliente-deactivate-result.type';
import type {
  ClienteConsumoMensualRepositoryResult,
  ClienteSumaVentaRecord,
  ClienteTopVentaRecord,
  ClienteUltimaVentaRecord,
} from '@backend/contracts/clientes/cliente-estadisticas-record.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type CrearClienteRecordCommand from '@backend/contracts/clientes/crear-cliente-record-command.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type { ClienteEstadisticasGeneralesInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
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
  ultimasVentas: readonly ClienteUltimaVentaRecord[] = [];
  topVentas: readonly ClienteTopVentaRecord[] = [];
  sumaVentas: readonly ClienteSumaVentaRecord[] = [];
  ultimasVentasPublicId: string | null = null;
  topVentasPublicId: string | null = null;
  sumaVentasPublicId: string | null = null;
  consumoMensualResult: ClienteConsumoMensualRepositoryResult = {
    years: [],
    items: [],
  };
  consumoMensualQuery: ClienteConsumoMensualRepositoryQuery | null = null;

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
   * Devuelve las últimas ventas configuradas para la prueba.
   */
  findUltimasVentas(publicId: string): Promise<readonly ClienteUltimaVentaRecord[]> {
    this.ultimasVentasPublicId = publicId;

    return Promise.resolve(this.ultimasVentas);
  }

  /**
   * Devuelve los artículos más comprados configurados para la prueba.
   */
  findTopVentas(publicId: string): Promise<readonly ClienteTopVentaRecord[]> {
    this.topVentasPublicId = publicId;

    return Promise.resolve(this.topVentas);
  }

  /**
   * Devuelve las sumas mensuales configuradas para la prueba.
   */
  findSumaVentas(publicId: string): Promise<readonly ClienteSumaVentaRecord[]> {
    this.sumaVentasPublicId = publicId;

    return Promise.resolve(this.sumaVentas);
  }

  /**
   * Devuelve el consumo temporal configurado para la prueba.
   */
  findConsumoMensual(
    query: ClienteConsumoMensualRepositoryQuery,
  ): Promise<ClienteConsumoMensualRepositoryResult> {
    this.consumoMensualQuery = query;

    return Promise.resolve(this.consumoMensualResult);
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

  it('construye las estadísticas generales ordenadas por años y meses', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.ultimasVentas = [
      {
        fecha: '2026-02-15T10:00:00.000Z',
        localizador: 260001,
        nombre: 'Producto reciente',
        unidades: 2,
        pvpMicros: 10_000_000,
        importeMicros: 20_000_000,
      },
    ];

    repository.topVentas = [
      {
        localizador: 260002,
        nombre: 'Producto principal',
        unidades: 4,
        importeMicros: 40_000_000,
      },
    ];

    repository.sumaVentas = [
      {
        year: 2026,
        month: 2,
        pucMicros: -4_000_000,
        pvpMicros: -10_000_000,
      },
      {
        year: 2025,
        month: 12,
        pucMicros: 9_000_000,
        pvpMicros: 30_000_000,
      },
      {
        year: 2026,
        month: 1,
        pucMicros: 4_000_000,
        pvpMicros: 20_000_000,
      },
    ];

    const result: ClienteEstadisticasGeneralesInterface =
      await service.getEstadisticasGenerales('  cliente-1  ');

    expect(repository.ultimasVentasPublicId).toBe('cliente-1');
    expect(repository.topVentasPublicId).toBe('cliente-1');
    expect(repository.sumaVentasPublicId).toBe('cliente-1');
    expect(result.ultimasVentas).toEqual(repository.ultimasVentas);
    expect(result.topVentas).toEqual(repository.topVentas);

    expect(result.sumaVentas).toEqual([
      {
        year: 2025,
        pucMicros: 9_000_000,
        pvpMicros: 30_000_000,
        beneficioMicros: 21_000_000,
        margenMicroporcentaje: 70_000_000,
        months: [
          {
            month: 12,
            pucMicros: 9_000_000,
            pvpMicros: 30_000_000,
            beneficioMicros: 21_000_000,
            margenMicroporcentaje: 70_000_000,
          },
        ],
      },
      {
        year: 2026,
        pucMicros: 0,
        pvpMicros: 10_000_000,
        beneficioMicros: 10_000_000,
        margenMicroporcentaje: 100_000_000,
        months: [
          {
            month: 1,
            pucMicros: 4_000_000,
            pvpMicros: 20_000_000,
            beneficioMicros: 16_000_000,
            margenMicroporcentaje: 80_000_000,
          },
          {
            month: 2,
            pucMicros: -4_000_000,
            pvpMicros: -10_000_000,
            beneficioMicros: -6_000_000,
            margenMicroporcentaje: 60_000_000,
          },
        ],
      },
    ]);

    expect(result.sumaVentasTotal).toEqual({
      pucMicros: 9_000_000,
      pvpMicros: 40_000_000,
      beneficioMicros: 31_000_000,
      margenMicroporcentaje: 77_500_000,
    });
  });

  it('devuelve un total neutro cuando el cliente no tiene ventas', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    const result: ClienteEstadisticasGeneralesInterface =
      await service.getEstadisticasGenerales('cliente-1');

    expect(result.sumaVentas).toEqual([]);
    expect(result.sumaVentasTotal).toEqual({
      pucMicros: 0,
      pvpMicros: 0,
      beneficioMicros: 0,
      margenMicroporcentaje: null,
    });
  });

  it('devuelve margen nulo cuando el PVP acumulado es cero', async (): Promise<void> => {
    const repository = new FakeClienteRepository();
    const service = new ClientesService(repository);

    repository.sumaVentas = [
      {
        year: 2026,
        month: 3,
        pucMicros: 5_000_000,
        pvpMicros: 0,
      },
    ];

    const result: ClienteEstadisticasGeneralesInterface =
      await service.getEstadisticasGenerales('cliente-1');

    expect(result.sumaVentas).toEqual([
      {
        year: 2026,
        pucMicros: 5_000_000,
        pvpMicros: 0,
        beneficioMicros: -5_000_000,
        margenMicroporcentaje: null,
        months: [
          {
            month: 3,
            pucMicros: 5_000_000,
            pvpMicros: 0,
            beneficioMicros: -5_000_000,
            margenMicroporcentaje: null,
          },
        ],
      },
    ]);
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
