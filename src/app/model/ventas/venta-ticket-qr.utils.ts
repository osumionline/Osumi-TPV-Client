import qrcode from 'qrcode-generator';

/**
 * Devuelve el contenido histórico utilizado por Osumi TPV
 * para identificar una venta mediante su código QR.
 *
 * Compatibilidad legacy:
 *
 * venta 123
 * → QR "-123"
 */
export function buildVentaTicketQrContent(idVenta: number): string {
  if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
    throw new RangeError('El identificador de la venta debe ser un entero mayor que cero.');
  }

  return `-${idVenta}`;
}

/**
 * Genera localmente un SVG autocontenido para el QR de una venta.
 *
 * El SVG puede incrustarse directamente en el HTML definitivo
 * del ticket y posteriormente renderizarse tanto a PDF como
 * a impresión térmica sin depender de recursos externos.
 */
export function buildVentaTicketQrSvg(idVenta: number): string {
  const qrContent: string = buildVentaTicketQrContent(idVenta);

  const qr = qrcode(0, 'M');

  qr.addData(qrContent, 'Byte');
  qr.make();

  return qr.createSvgTag({
    cellSize: 2,
    margin: 8,
    scalable: true,
  });
}
