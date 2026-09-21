import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type { SalidaCajaInterface } from '@desktop-contracts/caja/salida-caja.interface';
import CashOutflowsComponent from '@modules/caja/components/cash-outflows/cash-outflows.component';
import { DialogService } from '@osumi/angular-tools';
import CajaSalidasService from '@services/caja/caja-salidas.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('CashOutflowsComponent', (): void => {
  let fixture: ComponentFixture<CashOutflowsComponent>;
  let component: CashOutflowsComponent;

  let cajaAbierta: WritableSignal<CajaAbiertaInterface | null>;

  let getSalidasMock: Mock;
  let createSalidaMock: Mock;
  let updateSalidaMock: Mock;
  let deleteSalidaMock: Mock;
  let reloadContextMock: Mock;
  let confirmMock: Mock;

  beforeEach(async (): Promise<void> => {
    cajaAbierta = signal<CajaAbiertaInterface | null>({
      id: 1,
      publicId: 'caja-1',
      idTerminal: 1,
      apertura: '2026-09-21T08:00:00.000Z',
      importeAperturaCents: 10_000,
    });

    getSalidasMock = vi.fn().mockResolvedValue([]);
    createSalidaMock = vi.fn().mockResolvedValue(createSalida());
    updateSalidaMock = vi.fn().mockResolvedValue(createSalida());
    deleteSalidaMock = vi.fn().mockResolvedValue(undefined);
    reloadContextMock = vi.fn().mockResolvedValue(undefined);
    confirmMock = vi.fn().mockReturnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [CashOutflowsComponent],
      providers: [
        {
          provide: CajaSalidasService,
          useValue: {
            getSalidas: getSalidasMock,
            createSalida: createSalidaMock,
            updateSalida: updateSalidaMock,
            deleteSalida: deleteSalidaMock,
          },
        },
        {
          provide: VentasContextService,
          useValue: {
            cajaAbierta: cajaAbierta.asReadonly(),
            reload: reloadContextMock,
          },
        },
        {
          provide: DialogService,
          useValue: {
            confirm: confirmMock,
            alert: vi.fn().mockReturnValue(of(undefined)),
          },
        },
      ],
    })
      .overrideComponent(CashOutflowsComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CashOutflowsComponent);
    component = fixture.componentInstance;
  });

  it('carga inicialmente las salidas del día actual', async (): Promise<void> => {
    fixture.detectChanges();

    await fixture.whenStable();

    expect(reloadContextMock).toHaveBeenCalledTimes(1);
    expect(getSalidasMock).toHaveBeenCalledTimes(1);

    const consulta = getSalidasMock.mock.calls[0]?.[0];

    expect(consulta.desde).toBe(component.fecha());
    expect(consulta.hasta).toBe(component.fecha());
  });

  it('mantiene en solo lectura una salida perteneciente a una caja cerrada', (): void => {
    component.selectSalida(
      createSalida({
        publicId: 'salida-cerrada',
        editable: false,
      }),
    );

    expect(component.formEditable()).toBe(false);
    expect(component.canDelete()).toBe(false);
  });

  it('crea una salida usando la caja activa y convierte euros a céntimos', async (): Promise<void> => {
    component.startCreatingSalida();

    component.salidaCajaForm().reset({
      concepto: 'Folios',
      descripcion: 'Material de oficina',
      importeEuros: 12.34,
    });

    await component.saveSalida();

    expect(createSalidaMock).toHaveBeenCalledWith({
      cajaPublicId: 'caja-1',
      concepto: 'Folios',
      descripcion: 'Material de oficina',
      importeCents: 1_234,
    });

    expect(updateSalidaMock).not.toHaveBeenCalled();
    expect(component.selectedSalida()?.publicId).toBe('salida-1');
    expect(component.creatingSalida()).toBe(false);
    expect(component.saveSuccessful()).toBe(true);
  });

  it('actualiza una salida editable conservando su identidad', async (): Promise<void> => {
    component.selectSalida(createSalida());

    component.salidaCajaForm().reset({
      concepto: 'Material oficina',
      descripcion: '',
      importeEuros: 20,
    });

    await component.saveSalida();

    updateSalidaMock.mockResolvedValue(
      createSalida({
        concepto: 'Folios',
        descripcion: null,
        importeCents: 2_000,
      }),
    );
    expect(component.selectedSalida()?.publicId).toBe('salida-1');
    expect(component.selectedSalida()?.concepto).toBe('Folios');
    expect(component.saveSuccessful()).toBe(true);
  });

  it('elimina únicamente después de confirmar', async (): Promise<void> => {
    component.selectSalida(createSalida());

    await component.deleteSalida();

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(deleteSalidaMock).toHaveBeenCalledWith({
      publicId: 'salida-1',
      cajaPublicId: 'caja-1',
    });
    expect(component.selectedSalida()).toBeNull();
    expect(component.creatingSalida()).toBe(false);
  });

  it('impide crear una salida cuando no hay caja abierta', (): void => {
    cajaAbierta.set(null);

    component.startCreatingSalida();

    expect(component.creatingSalida()).toBe(false);
    expect(component.formEditable()).toBe(false);
  });

  it('rechaza un rango de fechas invertido sin consultar backend', async (): Promise<void> => {
    component.desde.set('2026-09-22');
    component.hasta.set('2026-09-21');

    await component.searchRange();

    expect(component.error()).toBe('La fecha inicial no puede ser posterior a la fecha final.');

    expect(getSalidasMock).not.toHaveBeenCalled();
  });
});

/**
 * Construye una salida reutilizable para las pruebas del componente.
 */
function createSalida(overrides: Partial<SalidaCajaInterface> = {}): SalidaCajaInterface {
  return {
    publicId: 'salida-1',
    concepto: 'Folios',
    descripcion: null,
    importeCents: 1_250,
    fecha: '2026-09-21T10:00:00.000Z',
    editable: true,
    ...overrides,
  };
}
