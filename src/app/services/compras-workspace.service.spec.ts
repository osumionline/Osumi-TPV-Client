import type PedidoListadoWorkspaceState from '@model/compras/pedidos/pedido-listado-workspace.interface';
import ComprasWorkspaceService from '@services/compras-workspace.service';
import { describe, expect, it } from 'vitest';

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
