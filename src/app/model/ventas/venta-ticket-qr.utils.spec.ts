import {
  buildVentaTicketQrContent,
  buildVentaTicketQrSvg,
} from '@model/ventas/venta-ticket-qr.utils';

describe('venta-ticket-qr.utils', (): void => {
  describe('buildVentaTicketQrContent', (): void => {
    it('mantiene el formato QR histórico de Osumi TPV', (): void => {
      expect(buildVentaTicketQrContent(123)).toBe('-123');
    });

    it('rechaza identificadores de venta no válidos', (): void => {
      expect((): string => buildVentaTicketQrContent(0)).toThrow();

      expect((): string => buildVentaTicketQrContent(-1)).toThrow();

      expect((): string => buildVentaTicketQrContent(1.5)).toThrow();
    });
  });

  describe('buildVentaTicketQrSvg', (): void => {
    it('genera un SVG autocontenido', (): void => {
      const svg: string = buildVentaTicketQrSvg(123);

      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('<path');
      expect(svg).toContain('</svg>');
    });
  });
});
