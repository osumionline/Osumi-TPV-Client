import {
  formatPurchaseOrderFileSize,
  getPurchaseOrderFileTypeLabel,
} from '@modules/compras/pedidos/components/purchase-order-files/purchase-order-files.component.private';
import { describe, expect, it } from 'vitest';

describe('purchase-order-files.component.private', (): void => {
  it('presenta los tipos documentales de Pedido', (): void => {
    expect(getPurchaseOrderFileTypeLabel('albaran')).toBe('Albarán');

    expect(getPurchaseOrderFileTypeLabel('factura')).toBe('Factura');

    expect(getPurchaseOrderFileTypeLabel('abono')).toBe('Abono');

    expect(getPurchaseOrderFileTypeLabel('documento')).toBe('Documento');

    expect(getPurchaseOrderFileTypeLabel('otro')).toBe('Otro');
  });

  it('formatea tamaños de PDF de forma compacta', (): void => {
    expect(formatPurchaseOrderFileSize(0)).toBe('0 B');

    expect(formatPurchaseOrderFileSize(512)).toBe('512 B');

    expect(formatPurchaseOrderFileSize(1536)).toBe('1,5 KB');

    expect(formatPurchaseOrderFileSize(1024 * 1024)).toBe('1 MB');

    expect(formatPurchaseOrderFileSize(12.5 * 1024 * 1024)).toBe('12,5 MB');
  });

  it('tolera un tamaño inválido sin romper la vista', (): void => {
    expect(formatPurchaseOrderFileSize(-1)).toBe('—');
  });
});
