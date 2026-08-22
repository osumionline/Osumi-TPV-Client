import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
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
