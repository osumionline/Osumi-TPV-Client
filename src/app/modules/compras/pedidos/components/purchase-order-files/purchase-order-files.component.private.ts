import type { PedidoArchivoTipo } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';

/**
 * Obtiene la etiqueta visible de un tipo documental
 * asociado a un PDF de Pedido.
 */
export function getPurchaseOrderFileTypeLabel(tipo: PedidoArchivoTipo): string {
  switch (tipo) {
    case 'albaran':
      return 'Albarán';

    case 'factura':
      return 'Factura';

    case 'abono':
      return 'Abono';

    case 'documento':
      return 'Documento';

    default:
      return 'Otro';
  }
}

/**
 * Formatea el tamaño de un PDF para mostrarlo
 * de forma compacta en la ficha.
 */
export function formatPurchaseOrderFileSize(sizeBytes: number): string {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    return '—';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kilobytes: number = sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${formatFileSizeNumber(kilobytes)} KB`;
  }

  return `${formatFileSizeNumber(kilobytes / 1024)} MB`;
}

/**
 * Limita un tamaño legible a un decimal
 * y utiliza coma como separador.
 */
function formatFileSizeNumber(value: number): string {
  const rounded: number = Math.round(value * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}
