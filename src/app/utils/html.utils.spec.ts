import { escapeHtml } from '@utils/html.utils';

describe('html.utils', (): void => {
  describe('escapeHtml', (): void => {
    it('escapa los caracteres con significado HTML', (): void => {
      expect(escapeHtml(`<script>alert("test")</script> & 'texto'`)).toBe(
        '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt; &amp; &#039;texto&#039;',
      );
    });

    it('conserva un texto que no necesita escape', (): void => {
      expect(escapeHtml('Reserva número 123')).toBe('Reserva número 123');
    });
  });
});
