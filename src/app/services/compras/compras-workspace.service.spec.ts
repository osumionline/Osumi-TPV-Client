import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';
import ComprasWorkspaceService from '@services/compras/compras-workspace.service';
import { beforeEach, describe, expect, it } from 'vitest';

let service: ComprasWorkspaceService;

const STATE: PedidoListadoWorkspaceState = {
  fechaDesde: '2026-01-01',
  fechaHasta: '2026-09-10',
  idProveedor: 4,
  numero: 'ORD',
  importeDesde: '10,50',
  importeHasta: '500',
  pagina: 3,
  num: 100,
};

describe('ComprasWorkspaceService', (): void => {
  beforeEach((): void => {
    service = new ComprasWorkspaceService();
  });

  it('comienza mostrando Pedidos', (): void => {
    expect(service.activeSection()).toBe('orders');
  });

  it('conserva la sección seleccionada mientras vive el servicio', (): void => {
    service.selectSection('brands');

    expect(service.activeSection()).toBe('brands');

    service.selectSection('suppliers');

    expect(service.activeSection()).toBe('suppliers');
  });

  it('limpia el workspace y restaura Pedidos como sección inicial', (): void => {
    service.selectSection('brands');
    service.setPedidosGuardadosState(STATE);
    service.setPedidosRecepcionadosState(STATE);

    service.clear();

    expect(service.activeSection()).toBe('orders');
    expect(service.getPedidosGuardadosState()).toBeNull();
    expect(service.getPedidosRecepcionadosState()).toBeNull();
  });

  it('mantiene independientes los dos listados de Pedidos', (): void => {
    const service = new ComprasWorkspaceService();

    service.setPedidosGuardadosState(STATE);

    expect(service.getPedidosGuardadosState()).toEqual(STATE);
    expect(service.getPedidosGuardadosState()).not.toBe(STATE);
    expect(service.getPedidosRecepcionadosState()).toBeNull();
  });

  it('conserva una copia del estado de recepcionados', (): void => {
    const service = new ComprasWorkspaceService();

    service.setPedidosRecepcionadosState(STATE);

    expect(service.getPedidosRecepcionadosState()).toEqual(STATE);
    expect(service.getPedidosRecepcionadosState()).not.toBe(STATE);
  });
});
