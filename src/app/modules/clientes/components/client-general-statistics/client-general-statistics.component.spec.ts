import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ClienteEstadisticasGeneralesInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import ClientGeneralStatisticsComponent from '@modules/clientes/components/client-general-statistics/client-general-statistics.component';
import ClientesService from '@services/clientes.service';

describe('ClientGeneralStatisticsComponent', (): void => {
  let fixture: ComponentFixture<ClientGeneralStatisticsComponent>;
  let clientesService: FakeClientesService;

  beforeEach(async (): Promise<void> => {
    clientesService = new FakeClientesService();

    await TestBed.configureTestingModule({
      imports: [ClientGeneralStatisticsComponent],
      providers: [
        {
          provide: ClientesService,
          useValue: clientesService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientGeneralStatisticsComponent);
    fixture.componentRef.setInput('clientePublicId', 'cliente-1');
    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('carga y muestra las dos colecciones de artículos', (): void => {
    expect(clientesService.requestedPublicIds).toEqual(['cliente-1']);

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Últimos artículos comprados');
    expect(element.textContent).toContain('Artículos más comprados');
    expect(element.textContent).toContain('23/08/2026');
    expect(element.textContent).toContain('260915');
    expect(element.textContent).toContain('Artículo reciente');
    expect(element.textContent).toContain('Artículo principal');

    expect(element.querySelectorAll('.client-general-statistics__recent-row')).toHaveLength(2);

    expect(element.querySelectorAll('.client-general-statistics__top-row')).toHaveLength(1);

    expect(element.querySelector('.client-general-statistics__negative')).not.toBeNull();
  });

  it('muestra el error y permite reintentar la consulta', async (): Promise<void> => {
    clientesService.error = new Error('Error simulado de estadísticas.');

    fixture.componentInstance.retry();

    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Error simulado de estadísticas.');

    clientesService.error = null;
    clientesService.result = createEstadisticasGenerales('Artículo recuperado');

    const retryButton: HTMLButtonElement | null = element.querySelector<HTMLButtonElement>(
      '.client-general-statistics__retry',
    );

    expect(retryButton).not.toBeNull();

    retryButton?.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(clientesService.requestedPublicIds).toEqual(['cliente-1', 'cliente-1', 'cliente-1']);

    expect(element.textContent).toContain('Artículo recuperado');
    expect(element.textContent).not.toContain('Error simulado de estadísticas.');
  });

  it('muestra estados independientes cuando no hay artículos', async (): Promise<void> => {
    clientesService.result = {
      ultimasVentas: [],
      topVentas: [],
      sumaVentas: [],
      sumaVentasTotal: {
        pucMicros: 0,
        pvpMicros: 0,
        beneficioMicros: 0,
        margenMicroporcentaje: null,
      },
    };

    fixture.componentInstance.retry();

    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('El cliente no ha comprado ningún artículo todavía.');

    expect(element.textContent).toContain(
      'No hay artículos suficientes para mostrar este listado.',
    );
  });
});

class FakeClientesService {
  readonly requestedPublicIds: string[] = [];

  result: ClienteEstadisticasGeneralesInterface = createEstadisticasGenerales('Artículo reciente');

  error: Error | null = null;

  /**
   * Registra la petición y devuelve el resultado configurado.
   */
  getEstadisticasGenerales(publicId: string): Promise<ClienteEstadisticasGeneralesInterface> {
    this.requestedPublicIds.push(publicId);

    return this.error === null ? Promise.resolve(this.result) : Promise.reject(this.error);
  }
}

/**
 * Crea unas estadísticas generales completas para las pruebas.
 */
function createEstadisticasGenerales(recentName: string): ClienteEstadisticasGeneralesInterface {
  return {
    ultimasVentas: [
      {
        fecha: '2026-08-23T10:30:00.000Z',
        localizador: 260915,
        nombre: recentName,
        unidades: 2,
        pvpMicros: 4_500_000,
        importeMicros: 9_000_000,
      },
      {
        fecha: '2026-08-22T18:00:00.000Z',
        localizador: null,
        nombre: 'Artículo devuelto',
        unidades: -1,
        pvpMicros: 3_000_000,
        importeMicros: -3_000_000,
      },
    ],
    topVentas: [
      {
        localizador: 260900,
        nombre: 'Artículo principal',
        unidades: 10,
        importeMicros: 45_000_000,
      },
    ],
    sumaVentas: [],
    sumaVentasTotal: {
      pucMicros: 20_000_000,
      pvpMicros: 51_000_000,
      beneficioMicros: 31_000_000,
      margenMicroporcentaje: 60_784_314,
    },
  };
}
