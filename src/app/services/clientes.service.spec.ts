import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import createClienteCommand from '@model/clientes/cliente-form-command.mapper';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import Cliente from '@model/clientes/cliente.model';
import ClientesService from '@services/clientes.service';

describe('ClientesService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let requestCount: number;
  let createdCliente: ClienteInterface;
  let updatedCliente: ClienteInterface;
  let receivedCreateCommand: CrearClienteCommand | null;
  let receivedUpdateCommand: ActualizarClienteCommand | null;
  let receivedDeactivatePublicId: string | null;
  let receivedGeneralStatisticsPublicId: string | null;
  let deactivateError: Error | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');
    requestCount = 0;
    createdCliente = createClienteInterface(7, 'cliente-7', 'Ada Lovelace');
    updatedCliente = createClienteInterface(7, 'cliente-7', 'Ada Lovelace');
    receivedCreateCommand = null;
    receivedUpdateCommand = null;
    receivedDeactivatePublicId = null;
    receivedGeneralStatisticsPublicId = null;
    deactivateError = null;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        clientes: {
          create: (command: CrearClienteCommand): Promise<ClienteInterface> => {
            receivedCreateCommand = command;

            return Promise.resolve(createdCliente);
          },
          update: (command: ActualizarClienteCommand): Promise<ClienteInterface> => {
            receivedUpdateCommand = command;

            return Promise.resolve(updatedCliente);
          },
          deactivate: (publicId: string): Promise<void> => {
            receivedDeactivatePublicId = publicId;

            return deactivateError === null ? Promise.resolve() : Promise.reject(deactivateError);
          },
          getEstadisticas: (): Promise<ClienteEstadisticasInterface> => {
            requestCount++;

            return Promise.resolve(createEstadisticas(`Artículo ${requestCount}`));
          },
          getEstadisticasGenerales: (
            publicId: string,
          ): Promise<ClienteEstadisticasGeneralesInterface> => {
            receivedGeneralStatisticsPublicId = publicId;

            return Promise.resolve(createEstadisticasGenerales());
          },
        },
      },
    });
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('vuelve a consultar las estadísticas después de invalidarlas', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    await service.loadEstadisticas('cliente-1');

    expect(requestCount).toBe(1);

    expect(service.getEstadisticasState('cliente-1').data?.ultimasVentas[0]?.nombre).toBe(
      'Artículo 1',
    );

    await service.invalidateEstadisticas('cliente-1');

    expect(service.getEstadisticasState('cliente-1').data).toBeNull();

    await service.loadEstadisticas('cliente-1');

    expect(requestCount).toBe(2);

    expect(service.getEstadisticasState('cliente-1').data?.ultimasVentas[0]?.nombre).toBe(
      'Artículo 2',
    );
  });

  it('mantiene una única ficha de cliente abierta', (): void => {
    const service: ClientesService = new ClientesService();

    const firstWorkspace: ClienteWorkspace = service.crearBorrador();
    const secondWorkspace: ClienteWorkspace = service.crearBorrador();

    expect(service.hasWorkspace()).toBe(true);
    expect(service.workspace()).toBe(secondWorkspace);
    expect(secondWorkspace).not.toBe(firstWorkspace);
    expect(secondWorkspace.clienteId).toBeNull();
    expect(secondWorkspace.clientePublicId).toBeNull();
    expect(secondWorkspace.activeSection).toBe('data');
    expect(secondWorkspace.dirty).toBe(false);
    expect(secondWorkspace.draft).not.toBe(secondWorkspace.baseSnapshot);
  });

  it('abre la ficha editable de un cliente persistido', (): void => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = new Cliente();

    cliente.id = 7;
    cliente.publicId = 'cliente-7';
    cliente.nombreApellidos = 'Ada Lovelace';
    cliente.dniCif = '12345678A';
    cliente.telefono = null;
    cliente.provincia = 48;
    cliente.factIgual = false;
    cliente.factNombreApellidos = 'Ada Lovelace Consulting';
    cliente.factProvincia = 28;
    cliente.descuento = 5;

    const workspace: ClienteWorkspace = service.abrirFicha(cliente);

    expect(workspace.clienteId).toBe(7);
    expect(workspace.clientePublicId).toBe('cliente-7');
    expect(workspace.draft.nombreApellidos).toBe('Ada Lovelace');
    expect(workspace.draft.dniCif).toBe('12345678A');
    expect(workspace.draft.telefono).toBe('');
    expect(workspace.draft.provincia).toBe('48');
    expect(workspace.draft.factIgual).toBe(false);
    expect(workspace.draft.factNombreApellidos).toBe('Ada Lovelace Consulting');
    expect(workspace.draft.factProvincia).toBe('28');
    expect(workspace.draft.descuento).toBe(5);
    expect(workspace.baseSnapshot).toEqual(workspace.draft);
    expect(workspace.baseSnapshot).not.toBe(workspace.draft);
    expect(workspace.dirty).toBe(false);
    expect(workspace.activeSection).toBe('data');
    expect(service.workspace()).toBe(workspace);
  });

  it('rechaza abrir la ficha de un cliente no persistido', (): void => {
    const service: ClientesService = new ClientesService();

    expect((): void => {
      service.abrirFicha(new Cliente());
    }).toThrowError('No se puede abrir la ficha de un cliente no persistido.');
  });

  it('limita las secciones disponibles de un cliente nuevo', (): void => {
    const service: ClientesService = new ClientesService();

    service.crearBorrador();

    expect(service.seleccionarSeccion('billing').activeSection).toBe('billing');
    expect((): void => {
      service.seleccionarSeccion('invoices');
    }).toThrowError('La sección indicada requiere un cliente persistido.');
  });

  it('conserva la sección elegida de un cliente persistido', (): void => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = new Cliente();

    cliente.id = 7;
    cliente.publicId = 'cliente-7';
    cliente.nombreApellidos = 'Ada Lovelace';

    service.abrirFicha(cliente);

    const workspace: ClienteWorkspace = service.seleccionarSeccion('statistics');

    expect(workspace.activeSection).toBe('statistics');
    expect(service.workspace()).toBe(workspace);
  });

  it('actualiza el draft y recalcula su estado dirty', (): void => {
    const service: ClientesService = new ClientesService();
    const initialWorkspace: ClienteWorkspace = service.crearBorrador();
    const modifiedDraft: ClienteFormModel = {
      ...initialWorkspace.draft,
      nombreApellidos: 'Ada Lovelace',
    };

    const modifiedWorkspace: ClienteWorkspace = service.actualizarDraft(modifiedDraft);

    expect(modifiedWorkspace.draft).toEqual(modifiedDraft);
    expect(modifiedWorkspace.draft).not.toBe(modifiedDraft);
    expect(modifiedWorkspace.dirty).toBe(true);

    const restoredWorkspace: ClienteWorkspace = service.actualizarDraft(
      initialWorkspace.baseSnapshot,
    );

    expect(restoredWorkspace.dirty).toBe(false);
  });

  it('cancela los cambios sin modificar la sección activa', (): void => {
    const service: ClientesService = new ClientesService();
    const initialWorkspace: ClienteWorkspace = service.crearBorrador();

    service.seleccionarSeccion('billing');
    service.actualizarDraft({
      ...initialWorkspace.draft,
      factIgual: false,
      factNombreApellidos: 'Ada Lovelace Consulting',
    });

    const cancelledWorkspace: ClienteWorkspace = service.cancelarCambios();

    expect(cancelledWorkspace.draft).toEqual(initialWorkspace.baseSnapshot);
    expect(cancelledWorkspace.draft).not.toBe(initialWorkspace.baseSnapshot);
    expect(cancelledWorkspace.dirty).toBe(false);
    expect(cancelledWorkspace.activeSection).toBe('billing');
  });

  it('cierra la ficha sin alterar la colección de clientes', (): void => {
    const service: ClientesService = new ClientesService();

    service.crearBorrador();
    service.cerrarFicha();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
    expect(service.clientes()).toEqual([]);
  });

  it('limpia también el workspace al reiniciar el servicio', (): void => {
    const service: ClientesService = new ClientesService();

    service.crearBorrador();
    service.clear();

    expect(service.workspace()).toBeNull();
    expect(service.hasWorkspace()).toBe(false);
  });

  it('incorpora directamente los clientes creados y mantiene el orden', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const zoeForm: ClienteFormModel = {
      ...createClienteFormInitialValue(),
      nombreApellidos: 'Zoe Baker',
    };
    const zoeCommand: CrearClienteCommand = createClienteCommand(zoeForm);

    createdCliente = createClienteInterface(8, 'cliente-8', 'Zoe Baker');

    const zoe: Cliente = await service.create(zoeCommand);

    const adaForm: ClienteFormModel = {
      ...createClienteFormInitialValue(),
      nombreApellidos: 'Ada Lovelace',
    };
    const adaCommand: CrearClienteCommand = createClienteCommand(adaForm);

    createdCliente = createClienteInterface(7, 'cliente-7', 'Ada Lovelace');

    const ada: Cliente = await service.create(adaCommand);

    expect(receivedCreateCommand).toBe(adaCommand);
    expect(service.clientes()).toEqual([ada, zoe]);
    expect(service.loaded()).toBe(true);
  });

  it('guarda un borrador y adopta la respuesta canónica como nuevo snapshot', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const initialWorkspace: ClienteWorkspace = service.crearBorrador();

    service.seleccionarSeccion('billing');
    service.actualizarDraft({
      ...initialWorkspace.draft,
      nombreApellidos: '  Ada Lovelace  ',
      telefono: '  944000000  ',
    });

    createdCliente = {
      ...createClienteInterface(7, 'cliente-7', 'Ada Lovelace'),
      telefono: '944000000',
    };

    const workspace: ClienteWorkspace = await service.guardar();

    expect(receivedCreateCommand).toMatchObject({
      nombreApellidos: 'Ada Lovelace',
      telefono: '944000000',
    });
    expect(workspace.clienteId).toBe(7);
    expect(workspace.clientePublicId).toBe('cliente-7');
    expect(workspace.draft.nombreApellidos).toBe('Ada Lovelace');
    expect(workspace.draft.telefono).toBe('944000000');
    expect(workspace.baseSnapshot).toEqual(workspace.draft);
    expect(workspace.baseSnapshot).not.toBe(workspace.draft);
    expect(workspace.dirty).toBe(false);
    expect(workspace.activeSection).toBe('billing');
    expect(service.workspace()).toBe(workspace);
    expect(service.findByPublicId('cliente-7')?.nombreApellidos).toBe('Ada Lovelace');
  });

  it('actualiza un cliente persistido y adopta la respuesta canónica', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = await service.create(
      createClienteCommand({
        ...createClienteFormInitialValue(),
        nombreApellidos: 'Ada Lovelace',
      }),
    );

    receivedCreateCommand = null;

    const initialWorkspace: ClienteWorkspace = service.abrirFicha(cliente);

    service.seleccionarSeccion('billing');
    service.actualizarDraft({
      ...initialWorkspace.draft,
      nombreApellidos: '  Ada Byron  ',
      telefono: '  944000000  ',
    });

    updatedCliente = {
      ...createClienteInterface(7, 'cliente-7', 'Ada Byron'),
      telefono: '944000000',
    };

    const workspace: ClienteWorkspace = await service.guardar();

    expect(receivedCreateCommand).toBeNull();
    expect(receivedUpdateCommand).toMatchObject({
      publicId: 'cliente-7',
      nombreApellidos: 'Ada Byron',
      telefono: '944000000',
    });
    expect(workspace.clienteId).toBe(7);
    expect(workspace.clientePublicId).toBe('cliente-7');
    expect(workspace.draft.nombreApellidos).toBe('Ada Byron');
    expect(workspace.draft.telefono).toBe('944000000');
    expect(workspace.baseSnapshot).toEqual(workspace.draft);
    expect(workspace.baseSnapshot).not.toBe(workspace.draft);
    expect(workspace.dirty).toBe(false);
    expect(workspace.activeSection).toBe('billing');
    expect(service.workspace()).toBe(workspace);
    expect(service.clientes()).toHaveLength(1);
    expect(service.findByPublicId('cliente-7')).toBe(cliente);
    expect(service.findByPublicId('cliente-7')?.nombreApellidos).toBe('Ada Byron');
  });

  it('da de baja un cliente y lo retira de todo el estado activo', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = await service.create(
      createClienteCommand({
        ...createClienteFormInitialValue(),
        nombreApellidos: 'Ada Lovelace',
      }),
    );

    service.abrirFicha(cliente);
    await service.loadEstadisticas('cliente-7');

    await service.darDeBaja();

    expect(receivedDeactivatePublicId).toBe('cliente-7');
    expect(service.findByPublicId('cliente-7')).toBeNull();
    expect(service.getEstadisticasState('cliente-7').data).toBeNull();
    expect(service.workspace()).toBeNull();
  });

  it('conserva la ficha, la colección y la caché cuando la baja falla', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = await service.create(
      createClienteCommand({
        ...createClienteFormInitialValue(),
        nombreApellidos: 'Ada Lovelace',
      }),
    );

    service.abrirFicha(cliente);
    await service.loadEstadisticas('cliente-7');

    deactivateError = new Error(
      'No se puede dar de baja el cliente porque tiene facturas en borrador.',
    );

    await expect(service.darDeBaja()).rejects.toThrow(
      'No se puede dar de baja el cliente porque tiene facturas en borrador.',
    );

    expect(receivedDeactivatePublicId).toBe('cliente-7');
    expect(service.findByPublicId('cliente-7')).toBe(cliente);
    expect(service.getEstadisticasState('cliente-7').data).not.toBeNull();
    expect(service.workspace()?.clientePublicId).toBe('cliente-7');
  });

  it('rechaza la baja de un cliente todavía no guardado', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    service.crearBorrador();

    await expect(service.darDeBaja()).rejects.toThrow(
      'Solo se puede dar de baja un cliente ya guardado.',
    );

    expect(receivedDeactivatePublicId).toBeNull();
  });

  it('rechaza la baja de un cliente con cambios sin guardar', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const cliente: Cliente = await service.create(
      createClienteCommand({
        ...createClienteFormInitialValue(),
        nombreApellidos: 'Ada Lovelace',
      }),
    );
    const workspace: ClienteWorkspace = service.abrirFicha(cliente);

    service.actualizarDraft({
      ...workspace.draft,
      nombreApellidos: 'Ada Byron',
    });

    await expect(service.darDeBaja()).rejects.toThrow(
      'Guarda o cancela los cambios antes de dar de baja el cliente.',
    );

    expect(receivedDeactivatePublicId).toBeNull();
    expect(service.findByPublicId('cliente-7')).toBe(cliente);
    expect(service.workspace()?.dirty).toBe(true);
  });

  it('solicita las estadísticas generales mediante su API específica', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    const result: ClienteEstadisticasGeneralesInterface =
      await service.getEstadisticasGenerales('cliente-7');

    expect(receivedGeneralStatisticsPublicId).toBe('cliente-7');
    expect(result).toEqual(createEstadisticasGenerales());
    expect(requestCount).toBe(0);
  });
});

function createEstadisticas(nombre: string): ClienteEstadisticasInterface {
  return {
    ultimasVentas: [
      {
        fecha: '2026-08-23T00:00:00.000Z',
        localizador: 1,
        nombre,
        unidades: 1,
        pvpMicros: 10_000_000,
        importeMicros: 10_000_000,
      },
    ],
    topVentas: [],
  };
}

/**
 * Crea unas estadísticas generales completas para las pruebas.
 */
function createEstadisticasGenerales(): ClienteEstadisticasGeneralesInterface {
  return {
    ...createEstadisticas('Artículo general'),
    sumaVentas: [
      {
        year: 2026,
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        beneficioMicros: 6_000_000,
        margenMicroporcentaje: 60_000_000,
        months: [
          {
            month: 8,
            pucMicros: 4_000_000,
            pvpMicros: 10_000_000,
            beneficioMicros: 6_000_000,
            margenMicroporcentaje: 60_000_000,
          },
        ],
      },
    ],
    sumaVentasTotal: {
      pucMicros: 4_000_000,
      pvpMicros: 10_000_000,
      beneficioMicros: 6_000_000,
      margenMicroporcentaje: 60_000_000,
    },
  };
}

/**
 * Crea la respuesta mínima de un cliente persistido para las pruebas del servicio.
 */
function createClienteInterface(
  id: number,
  publicId: string,
  nombreApellidos: string,
): ClienteInterface {
  return {
    id,
    publicId,
    nombreApellidos,
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
    ultimaVenta: null,
  };
}
