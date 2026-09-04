import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { MatSelectChange } from '@angular/material/select';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import ClientMonthlyConsumptionComponent from '@modules/clientes/components/client-monthly-consumption/client-monthly-consumption.component';
import ClientesService from '@services/clientes.service';

describe('ClientMonthlyConsumptionComponent', (): void => {
  let fixture: ComponentFixture<ClientMonthlyConsumptionComponent>;
  let component: ClientMonthlyConsumptionComponent;
  let clientesService: FakeClientesService;

  beforeEach(async (): Promise<void> => {
    clientesService = new FakeClientesService();

    await TestBed.configureTestingModule({
      imports: [ClientMonthlyConsumptionComponent],
      providers: [
        {
          provide: ClientesService,
          useValue: clientesService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientMonthlyConsumptionComponent);
    fixture.componentRef.setInput('clientePublicId', 'cliente-1');
    component = fixture.componentInstance;
  });

  it('solicita inicialmente el año actual completo', async (): Promise<void> => {
    component.ngOnInit();

    expect(clientesService.pendingRequests).toHaveLength(1);
    expect(clientesService.pendingRequests[0]?.consulta).toEqual({
      clientePublicId: 'cliente-1',
      year: new Date().getFullYear(),
      month: null,
    });
    expect(component.loading()).toBe(true);

    clientesService.pendingRequests[0]?.resolve(createConsumoMensualResult(12_000_000));

    await flushPromises();

    expect(component.result()).toEqual(createConsumoMensualResult(12_000_000));
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeNull();
    expect(component.noConsumption()).toBe(false);
    expect(component.formatTotal()).toContain('12,00');
  });

  it('recarga al cambiar los filtros e ignora valores no válidos', (): void => {
    component.ngOnInit();

    component.onMonthChange({
      value: 8,
    } as MatSelectChange);

    component.onYearChange({
      value: null,
    } as MatSelectChange);

    expect(clientesService.pendingRequests[1]?.consulta).toEqual({
      clientePublicId: 'cliente-1',
      year: new Date().getFullYear(),
      month: 8,
    });

    expect(clientesService.pendingRequests[2]?.consulta).toEqual({
      clientePublicId: 'cliente-1',
      year: null,
      month: 8,
    });

    component.onMonthChange({
      value: 13,
    } as MatSelectChange);

    component.onYearChange({
      value: 0,
    } as MatSelectChange);

    expect(clientesService.pendingRequests).toHaveLength(3);
  });

  it('descarta respuestas antiguas cuando los filtros cambian rápidamente', async (): Promise<void> => {
    component.ngOnInit();

    component.onMonthChange({
      value: 8,
    } as MatSelectChange);

    expect(clientesService.pendingRequests).toHaveLength(2);

    clientesService.pendingRequests[1]?.resolve(createConsumoMensualResult(20_000_000));

    await flushPromises();

    expect(component.result()?.totalMicros).toBe(20_000_000);
    expect(component.loading()).toBe(false);

    clientesService.pendingRequests[0]?.resolve(createConsumoMensualResult(10_000_000));

    await flushPromises();

    expect(component.result()?.totalMicros).toBe(20_000_000);
    expect(component.loading()).toBe(false);
  });

  it('muestra el error y permite reintentar la consulta', async (): Promise<void> => {
    component.ngOnInit();

    clientesService.pendingRequests[0]?.reject(new Error('Error simulado de consumo.'));

    await flushPromises();

    expect(component.result()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('Error simulado de consumo.');

    component.retry();

    expect(clientesService.pendingRequests).toHaveLength(2);
    expect(component.loading()).toBe(true);
    expect(component.error()).toBeNull();

    clientesService.pendingRequests[1]?.resolve(createConsumoMensualResult(0));

    await flushPromises();

    expect(component.result()?.totalMicros).toBe(0);
    expect(component.noConsumption()).toBe(true);
    expect(component.error()).toBeNull();
  });
});

interface PendingConsumoMensualRequest {
  readonly consulta: ClienteConsumoMensualConsulta;
  readonly resolve: (result: ClienteConsumoMensualResultado) => void;
  readonly reject: (reason: unknown) => void;
}

class FakeClientesService {
  readonly pendingRequests: PendingConsumoMensualRequest[] = [];

  /**
   * Registra una consulta pendiente controlable desde la prueba.
   */
  getConsumoMensual(
    consulta: ClienteConsumoMensualConsulta,
  ): Promise<ClienteConsumoMensualResultado> {
    return new Promise<ClienteConsumoMensualResultado>(
      (
        resolve: (result: ClienteConsumoMensualResultado) => void,
        reject: (reason: unknown) => void,
      ): void => {
        this.pendingRequests.push({
          consulta,
          resolve,
          reject,
        });
      },
    );
  }
}

/**
 * Crea un resultado de consumo mensual para las pruebas.
 */
function createConsumoMensualResult(importeMicros: number): ClienteConsumoMensualResultado {
  return {
    availableYears: [2025, 2026],
    points: [
      {
        year: 2026,
        month: 1,
        day: null,
        importeMicros,
      },
    ],
    totalMicros: importeMicros,
  };
}

/**
 * Espera a que terminen las continuaciones de promesas pendientes.
 */
async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
