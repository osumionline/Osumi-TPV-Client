import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import Cliente from '@model/clientes/cliente.model';
import ClientesService from '@services/clientes.service';

describe('ClientesService', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;

  let requestCount: number;

  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    requestCount = 0;

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        clientes: {
          getEstadisticas: (): Promise<ClienteEstadisticasInterface> => {
            requestCount++;

            return Promise.resolve(createEstadisticas(`Artículo ${requestCount}`));
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
