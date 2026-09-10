import { describe, expect, it } from 'vitest';
import {
  formatPedidoDate,
  formatPedidoTipo,
  parsePedidoFilterAmountMicros,
} from './pedidos.component.private';

describe('pedidos.component.private', (): void => {
  it('convierte euros con coma o punto a microeuros', (): void => {
    expect(parsePedidoFilterAmountMicros('28,67')).toBe(28_670_000);
    expect(parsePedidoFilterAmountMicros('603.99')).toBe(603_990_000);
    expect(parsePedidoFilterAmountMicros('')).toBeNull();
  });

  it('rechaza importes que no puedan representarse correctamente', (): void => {
    expect(() => parsePedidoFilterAmountMicros('-1')).toThrow();
    expect(() => parsePedidoFilterAmountMicros('12,1234567')).toThrow();
  });

  it('formatea fechas civiles sin usar Date', (): void => {
    expect(formatPedidoDate('2026-05-29')).toBe('29/05/2026');
    expect(formatPedidoDate('2026-05-29 12:30:00')).toBe('29/05/2026');
    expect(formatPedidoDate(null)).toBe('—');
  });

  it('presenta tipo y número documental', (): void => {
    expect(formatPedidoTipo('factura', 'ORD-1077436')).toBe('Factura: ORD-1077436');
    expect(formatPedidoTipo('abono', null)).toBe('Abono');
  });
});
