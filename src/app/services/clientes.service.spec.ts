import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import createClienteCommand from '@model/clientes/cliente-form-command.mapper';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import Cliente from '@model/clientes/cliente.model';
import ClientesService from '@services/clientes.service';

describe('ClientesService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let requestCount: number;
  let facturasRequestCount: number;
  let facturasResult: readonly ClienteFacturaInterface[];
  let facturasRequestFactory: (() => Promise<readonly ClienteFacturaInterface[]>) | null;
  let receivedFacturasPublicId: string | null;
  let ventasDisponiblesResult: readonly ClienteFacturaVentaDisponibleInterface[];
  let receivedVentasDisponiblesConsulta: ClienteFacturaVentasDisponiblesConsulta | null;
  let createdFacturaBorrador: ClienteFacturaInterface;
  let updatedFacturaBorrador: ClienteFacturaInterface;
  let receivedCreateFacturaBorradorCommand: CrearClienteFacturaBorradorCommand | null;
  let receivedUpdateFacturaBorradorCommand: ActualizarClienteFacturaBorradorCommand | null;
  let receivedDeleteFacturaBorradorCommand: EliminarClienteFacturaBorradorCommand | null;
  let createdCliente: ClienteInterface;
  let updatedCliente: ClienteInterface;
  let receivedCreateCommand: CrearClienteCommand | null;
  let receivedUpdateCommand: ActualizarClienteCommand | null;
  let receivedDeactivatePublicId: string | null;
  let receivedGeneralStatisticsPublicId: string | null;
  let deactivateError: Error | null;
  let receivedConsumoMensualConsulta: ClienteConsumoMensualConsulta | null;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');
    requestCount = 0;
    facturasRequestCount = 0;
    facturasResult = createFacturas(12_345);
    facturasRequestFactory = null;
    receivedFacturasPublicId = null;
    ventasDisponiblesResult = createVentasDisponibles();
    receivedVentasDisponiblesConsulta = null;
    createdFacturaBorrador = createFacturaBorrador('factura-borrador-creada', 2_500);
    updatedFacturaBorrador = createFacturaBorrador('factura-borrador', 3_500);
    receivedCreateFacturaBorradorCommand = null;
    receivedUpdateFacturaBorradorCommand = null;
    receivedDeleteFacturaBorradorCommand = null;
    createdCliente = createClienteInterface(7, 'cliente-7', 'Ada Lovelace');
    updatedCliente = createClienteInterface(7, 'cliente-7', 'Ada Lovelace');
    receivedCreateCommand = null;
    receivedUpdateCommand = null;
    receivedDeactivatePublicId = null;
    receivedGeneralStatisticsPublicId = null;
    deactivateError = null;
    receivedConsumoMensualConsulta = null;

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
          getFacturas: (publicId: string): Promise<readonly ClienteFacturaInterface[]> => {
            receivedFacturasPublicId = publicId;
            facturasRequestCount++;

            return facturasRequestFactory?.() ?? Promise.resolve(facturasResult);
          },
          createFacturaBorrador: (
            command: CrearClienteFacturaBorradorCommand,
          ): Promise<ClienteFacturaInterface> => {
            receivedCreateFacturaBorradorCommand = command;

            return Promise.resolve(createdFacturaBorrador);
          },
          updateFacturaBorrador: (
            command: ActualizarClienteFacturaBorradorCommand,
          ): Promise<ClienteFacturaInterface> => {
            receivedUpdateFacturaBorradorCommand = command;

            return Promise.resolve(updatedFacturaBorrador);
          },
          deleteFacturaBorrador: (
            command: EliminarClienteFacturaBorradorCommand,
          ): Promise<void> => {
            receivedDeleteFacturaBorradorCommand = command;

            return Promise.resolve();
          },
          getFacturaVentasDisponibles: (
            consulta: ClienteFacturaVentasDisponiblesConsulta,
          ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> => {
            receivedVentasDisponiblesConsulta = consulta;

            return Promise.resolve(ventasDisponiblesResult);
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
          getConsumoMensual: (
            consulta: ClienteConsumoMensualConsulta,
          ): Promise<ClienteConsumoMensualResultado> => {
            receivedConsumoMensualConsulta = consulta;

            return Promise.resolve(createConsumoMensual());
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

  it('cachea las facturas y vuelve a consultarlas después de invalidarlas', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    await service.loadFacturas('  cliente-7  ');
    await service.loadFacturas('cliente-7');

    expect(receivedFacturasPublicId).toBe('cliente-7');
    expect(facturasRequestCount).toBe(1);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: createFacturas(12_345),
      loading: false,
      error: null,
    });

    facturasResult = createFacturas(24_690);

    await service.invalidateFacturas('cliente-7');

    expect(service.getFacturasState('cliente-7').data).toBeNull();

    await service.loadFacturas('cliente-7');

    expect(facturasRequestCount).toBe(2);
    expect(service.getFacturasState('cliente-7').data).toEqual(createFacturas(24_690));
  });

  it('conserva el error de facturas y permite reintentar la consulta', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    facturasRequestFactory = (): Promise<readonly ClienteFacturaInterface[]> =>
      Promise.reject(new Error('Fallo IPC'));

    await service.loadFacturas('cliente-7');

    expect(service.getFacturasState('cliente-7')).toEqual({
      data: null,
      loading: false,
      error: 'Fallo IPC',
    });

    facturasRequestFactory = null;

    await service.reloadFacturas('cliente-7');

    expect(facturasRequestCount).toBe(2);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: createFacturas(12_345),
      loading: false,
      error: null,
    });
  });

  it('descarta una respuesta de facturas iniciada antes de limpiar el servicio', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    let resolveFacturas: (value: readonly ClienteFacturaInterface[]) => void = (): void =>
      undefined;

    facturasRequestFactory = (): Promise<readonly ClienteFacturaInterface[]> =>
      new Promise<readonly ClienteFacturaInterface[]>((resolve): void => {
        resolveFacturas = resolve;
      });

    const pendingRequest: Promise<void> = service.loadFacturas('cliente-7');

    expect(service.getFacturasState('cliente-7').loading).toBe(true);

    service.clear();
    resolveFacturas(createFacturas(12_345));

    await pendingRequest;

    expect(service.getFacturasState('cliente-7')).toEqual({
      data: null,
      loading: false,
      error: null,
    });
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
    await service.loadFacturas('cliente-7');
    await service.loadEstadisticas('cliente-7');

    await service.darDeBaja();

    expect(receivedDeactivatePublicId).toBe('cliente-7');
    expect(service.findByPublicId('cliente-7')).toBeNull();
    expect(service.getFacturasState('cliente-7').data).toBeNull();
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
    await service.loadFacturas('cliente-7');
    await service.loadEstadisticas('cliente-7');

    deactivateError = new Error(
      'No se puede dar de baja el cliente porque tiene facturas en borrador.',
    );

    await expect(service.darDeBaja()).rejects.toThrow(
      'No se puede dar de baja el cliente porque tiene facturas en borrador.',
    );

    expect(receivedDeactivatePublicId).toBe('cliente-7');
    expect(service.findByPublicId('cliente-7')).toBe(cliente);
    expect(service.getFacturasState('cliente-7').data).not.toBeNull();
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

  it('reconcilia un borrador creado después de cualquier lectura anterior', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    let resolveFacturas: (value: readonly ClienteFacturaInterface[]) => void = (): void =>
      undefined;

    facturasRequestFactory = (): Promise<readonly ClienteFacturaInterface[]> =>
      new Promise<readonly ClienteFacturaInterface[]>((resolve): void => {
        resolveFacturas = resolve;
      });

    const loadRequest: Promise<void> = service.loadFacturas('cliente-7');
    const command: CrearClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      ventasPublicIds: ['venta-1'],
    };
    const createRequest: Promise<ClienteFacturaInterface> = service.createFacturaBorrador(command);

    resolveFacturas(createFacturas(12_345));

    const [result] = await Promise.all([createRequest, loadRequest]);

    expect(receivedCreateFacturaBorradorCommand).toBe(command);
    expect(result).toBe(createdFacturaBorrador);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: [createdFacturaBorrador, ...createFacturas(12_345)],
      loading: false,
      error: null,
    });
  });

  it('sustituye un borrador actualizado sin duplicarlo en la caché', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const originalBorrador: ClienteFacturaInterface = createFacturaBorrador(
      'factura-borrador',
      2_000,
    );

    facturasResult = [originalBorrador, ...createFacturas(12_345)];

    await service.loadFacturas('cliente-7');

    const command: ActualizarClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      borradorPublicId: 'factura-borrador',
      ventasPublicIds: ['venta-1', 'venta-2'],
    };

    const result: ClienteFacturaInterface = await service.updateFacturaBorrador(command);

    expect(receivedUpdateFacturaBorradorCommand).toBe(command);
    expect(result).toBe(updatedFacturaBorrador);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: [updatedFacturaBorrador, ...createFacturas(12_345)],
      loading: false,
      error: null,
    });
  });

  it('retira de la caché un borrador eliminado', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const borrador: ClienteFacturaInterface = createFacturaBorrador('factura-borrador', 2_000);

    facturasResult = [borrador, ...createFacturas(12_345)];

    await service.loadFacturas('cliente-7');

    const command: EliminarClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      borradorPublicId: 'factura-borrador',
    };

    await service.deleteFacturaBorrador(command);

    expect(receivedDeleteFacturaBorradorCommand).toBe(command);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: createFacturas(12_345),
      loading: false,
      error: null,
    });
  });

  it('reconcilia un borrador creado después de cualquier lectura anterior', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    let resolveFacturas: (value: readonly ClienteFacturaInterface[]) => void = (): void =>
      undefined;

    facturasRequestFactory = (): Promise<readonly ClienteFacturaInterface[]> =>
      new Promise<readonly ClienteFacturaInterface[]>((resolve): void => {
        resolveFacturas = resolve;
      });

    const loadRequest: Promise<void> = service.loadFacturas('cliente-7');
    const command: CrearClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      ventasPublicIds: ['venta-1'],
    };
    const createRequest: Promise<ClienteFacturaInterface> = service.createFacturaBorrador(command);

    resolveFacturas(createFacturas(12_345));

    const [result] = await Promise.all([createRequest, loadRequest]);

    expect(receivedCreateFacturaBorradorCommand).toBe(command);
    expect(result).toBe(createdFacturaBorrador);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: [createdFacturaBorrador, ...createFacturas(12_345)],
      loading: false,
      error: null,
    });
  });

  it('sustituye un borrador actualizado sin duplicarlo en la caché', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const originalBorrador: ClienteFacturaInterface = createFacturaBorrador(
      'factura-borrador',
      2_000,
    );

    facturasResult = [originalBorrador, ...createFacturas(12_345)];

    await service.loadFacturas('cliente-7');

    const command: ActualizarClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      borradorPublicId: 'factura-borrador',
      ventasPublicIds: ['venta-1', 'venta-2'],
    };

    const result: ClienteFacturaInterface = await service.updateFacturaBorrador(command);

    expect(receivedUpdateFacturaBorradorCommand).toBe(command);
    expect(result).toBe(updatedFacturaBorrador);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: [updatedFacturaBorrador, ...createFacturas(12_345)],
      loading: false,
      error: null,
    });
  });

  it('retira de la caché un borrador eliminado', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const borrador: ClienteFacturaInterface = createFacturaBorrador('factura-borrador', 2_000);

    facturasResult = [borrador, ...createFacturas(12_345)];

    await service.loadFacturas('cliente-7');

    const command: EliminarClienteFacturaBorradorCommand = {
      clientePublicId: 'cliente-7',
      borradorPublicId: 'factura-borrador',
    };

    await service.deleteFacturaBorrador(command);

    expect(receivedDeleteFacturaBorradorCommand).toBe(command);
    expect(service.getFacturasState('cliente-7')).toEqual({
      data: createFacturas(12_345),
      loading: false,
      error: null,
    });
  });

  it('solicita las ventas disponibles mediante su API específica', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const consulta: ClienteFacturaVentasDisponiblesConsulta = {
      clientePublicId: 'cliente-7',
      borradorPublicId: 'factura-borrador',
    };

    const result: readonly ClienteFacturaVentaDisponibleInterface[] =
      await service.getFacturaVentasDisponibles(consulta);

    expect(receivedVentasDisponiblesConsulta).toBe(consulta);
    expect(result).toEqual(createVentasDisponibles());
    expect(facturasRequestCount).toBe(0);
  });

  it('solicita las estadísticas generales mediante su API específica', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();

    const result: ClienteEstadisticasGeneralesInterface =
      await service.getEstadisticasGenerales('cliente-7');

    expect(receivedGeneralStatisticsPublicId).toBe('cliente-7');
    expect(result).toEqual(createEstadisticasGenerales());
    expect(requestCount).toBe(0);
  });

  it('solicita el consumo mensual mediante su API específica', async (): Promise<void> => {
    const service: ClientesService = new ClientesService();
    const consulta: ClienteConsumoMensualConsulta = {
      clientePublicId: 'cliente-7',
      year: null,
      month: 8,
    };

    const result: ClienteConsumoMensualResultado = await service.getConsumoMensual(consulta);

    expect(receivedConsumoMensualConsulta).toBe(consulta);
    expect(result).toEqual(createConsumoMensual());
    expect(requestCount).toBe(0);
  });
});

/**
 * Crea una colección de ventas disponibles para
 * las pruebas del acceso Angular.
 */
function createVentasDisponibles(): readonly ClienteFacturaVentaDisponibleInterface[] {
  return [
    {
      id: 41,
      publicId: 'venta-41',
      serie: '',
      numero: 412,
      fecha: '2026-08-31T10:30:00.000Z',
      totalCents: 1_250,
      incluidaEnBorrador: true,
      pagos: [
        {
          tipoPagoPublicId: 'efectivo',
          nombre: 'Efectivo',
          importeCents: 1_250,
        },
      ],
    },
  ];
}

/**
 * Crea un borrador de factura para probar
 * la reconciliación del estado Angular.
 */
function createFacturaBorrador(publicId: string, importeCents: number): ClienteFacturaInterface {
  return {
    publicId,
    serie: '',
    numero: null,
    year: null,
    numeroFactura: null,
    estado: 'borrador',
    fecha: '2026-09-05T10:00:00.000Z',
    fechaCreacion: '2026-09-05T10:00:00.000Z',
    fechaEmision: null,
    fechaAnulacion: null,
    importeCents,
    capacidades: {
      puedeEditar: true,
      puedeEliminar: true,
      puedePrevisualizar: true,
      puedeFacturar: true,
      puedeImprimir: false,
      puedeEnviarEmail: false,
      puedeAnular: false,
    },
  };
}

/**
 * Crea una factura emitida para las pruebas del estado Angular.
 */
function createFacturas(importeCents: number): readonly ClienteFacturaInterface[] {
  return [
    {
      publicId: 'factura-1',
      serie: '',
      numero: 21,
      year: 2026,
      numeroFactura: '21_2026',
      estado: 'emitida',
      fecha: '2026-09-04T10:00:00.000Z',
      fechaCreacion: '2026-09-03T10:00:00.000Z',
      fechaEmision: '2026-09-04T10:00:00.000Z',
      fechaAnulacion: null,
      importeCents,
      capacidades: {
        puedeEditar: false,
        puedeEliminar: false,
        puedePrevisualizar: false,
        puedeFacturar: false,
        puedeImprimir: true,
        puedeEnviarEmail: true,
        puedeAnular: true,
      },
    },
  ];
}

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

/**
 * Crea una serie de consumo mensual para las pruebas.
 */
function createConsumoMensual(): ClienteConsumoMensualResultado {
  return {
    availableYears: [2025, 2026],
    points: [
      {
        year: 2025,
        month: 8,
        day: null,
        importeMicros: 4_000_000,
      },
      {
        year: 2026,
        month: 8,
        day: null,
        importeMicros: 8_000_000,
      },
    ],
    totalMicros: 12_000_000,
  };
}
