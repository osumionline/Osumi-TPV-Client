import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type ReservaInterface from '@desktop-contracts/ventas/reservas/reserva.interface';
import Cliente from '@model/clientes/cliente.model';
import Empleado from '@model/empleados/empleado.model';
import SalesComponent from '@modules/ventas/pages/sales/sales.component';
import { DialogService } from '@osumi/angular-tools';
import ClienteProteccionDatosPrintService from '@services/clientes/cliente-proteccion-datos-print.service';
import ClientesService from '@services/clientes/clientes.service';
import EmpleadosService from '@services/empleados/empleados.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import VentasService from '@services/ventas/ventas.service';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('SalesComponent', (): void => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let empleados: WritableSignal<readonly Empleado[]>;
  let alertMock: Mock;
  let crearVentaMock: Mock;
  let crearVentaDesdeReservasMock: Mock;
  let cliente: Cliente;

  beforeEach(async (): Promise<void> => {
    empleados = signal<readonly Empleado[]>([]);
    alertMock = vi.fn();
    crearVentaMock = vi.fn();
    crearVentaDesdeReservasMock = vi.fn();
    cliente = createCliente();

    await TestBed.configureTestingModule({
      imports: [SalesComponent],

      providers: [
        {
          provide: DialogService,
          useValue: {
            alert: alertMock,
            confirm: vi.fn(),
          },
        },
        {
          provide: EmpleadosService,
          useValue: {
            empleados: empleados.asReadonly(),
          },
        },
        {
          provide: VentasContextService,
          useValue: {
            puedeVender: (): boolean => true,
            appData: (): null => null,
          },
        },
        {
          provide: VentasService,
          useValue: {
            crearVenta: crearVentaMock,
            crearVentaDesdeReservas: crearVentaDesdeReservasMock,
            ventaActivaId: (): null => null,
            findById: vi.fn(),
            setFocusTarget: vi.fn(),
          },
        },
        {
          provide: ClientesService,
          useValue: {
            load: (): Promise<void> => Promise.resolve(),
            findByPublicId: (publicId: string): Cliente | null =>
              publicId === cliente.publicId ? cliente : null,
          },
        },
        {
          provide: ClienteProteccionDatosPrintService,
          useValue: {
            print: vi.fn(),
          },
        },
      ],
    })
      .overrideComponent(SalesComponent, {
        set: {
          template: '',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
  });

  it('muestra un error si no hay empleados disponibles', (): void => {
    empleados.set([]);
    component.nuevaVenta();

    expect(crearVentaMock).not.toHaveBeenCalled();
    expect(component.selectingEmployee()).toBe(false);
    expect(alertMock).toHaveBeenCalledWith({
      title: 'Error',

      content: 'No existe ningún empleado disponible para crear una venta.',
    });
  });

  it('asigna automáticamente el único empleado disponible', (): void => {
    const empleado: Empleado = createEmpleado(1, 'Ana');
    empleados.set([empleado]);
    component.nuevaVenta();

    expect(crearVentaMock).toHaveBeenCalledTimes(1);
    expect(crearVentaMock).toHaveBeenCalledWith(empleado);
    expect(component.selectingEmployee()).toBe(false);
  });

  it('abre el selector cuando hay más de un empleado', (): void => {
    const first: Empleado = createEmpleado(1, 'Ana');
    const second: Empleado = createEmpleado(2, 'Jon');

    empleados.set([first, second]);
    component.nuevaVenta();

    expect(crearVentaMock).not.toHaveBeenCalled();
    expect(component.selectingEmployee()).toBe(true);

    component.selectEmpleado(second);

    expect(component.selectingEmployee()).toBe(false);
    expect(crearVentaMock).toHaveBeenCalledTimes(1);
    expect(crearVentaMock).toHaveBeenCalledWith(second);
  });

  it('carga directamente una reserva cuando solo hay un empleado', async (): Promise<void> => {
    const empleado: Empleado = createEmpleado(1, 'Ana');
    const reserva: ReservaInterface = createReserva();

    empleados.set([empleado]);
    component.managingReservas.set(true);

    await component.loadReservas([reserva]);

    expect(component.managingReservas()).toBe(false);
    expect(component.selectingEmployee()).toBe(false);
    expect(crearVentaDesdeReservasMock).toHaveBeenCalledTimes(1);
    expect(crearVentaDesdeReservasMock).toHaveBeenCalledWith(empleado, cliente, [reserva]);
  });

  it('solicita empleado antes de cargar reservas cuando hay varios', async (): Promise<void> => {
    const first: Empleado = createEmpleado(1, 'Ana');
    const second: Empleado = createEmpleado(2, 'Jon');
    const reserva: ReservaInterface = createReserva();

    empleados.set([first, second]);
    component.managingReservas.set(true);

    await component.loadReservas([reserva]);

    expect(component.managingReservas()).toBe(false);
    expect(crearVentaDesdeReservasMock).not.toHaveBeenCalled();
    expect(component.selectingEmployee()).toBe(true);

    component.selectEmpleado(second);

    expect(component.selectingEmployee()).toBe(false);
    expect(crearVentaDesdeReservasMock).toHaveBeenCalledTimes(1);
    expect(crearVentaDesdeReservasMock).toHaveBeenCalledWith(second, cliente, [reserva]);
  });
});

/**
 * Construye un empleado persistido
 * suficiente para las pruebas de Ventas.
 */
function createEmpleado(id: number, nombre: string): Empleado {
  const empleado: Empleado = new Empleado();
  empleado.id = id;
  empleado.publicId = `empleado-${id}`;
  empleado.nombre = nombre;

  return empleado;
}

/**
 * Construye el cliente asociado
 * a la reserva de prueba.
 */
function createCliente(): Cliente {
  const cliente: Cliente = new Cliente();
  cliente.id = 10;
  cliente.publicId = 'cliente-10';
  cliente.nombreApellidos = 'Cliente reserva';

  return cliente;
}

/**
 * Construye una reserva mínima válida
 * para comprobar la selección de empleado.
 */
function createReserva(): ReservaInterface {
  return {
    id: 20,
    publicId: 'reserva-20',
    idCliente: 10,
    clientePublicId: 'cliente-10',
    clienteNombre: 'Cliente reserva',
    totalMicros: 1_000_000,
    fecha: '2026-09-21 10:00:00',
    lineas: [],
  };
}
