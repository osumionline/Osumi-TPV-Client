import { normalizeTextForSearch, trimToNull } from '@utils/string.utils';

describe('string.utils', (): void => {
  describe('normalizeTextForSearch', (): void => {
    it('normaliza mayúsculas, espacios y diacríticos', (): void => {
      expect(normalizeTextForSearch('  José Gómez  ')).toBe('jose gomez');
    });

    it('permite comparar textos independientemente de sus acentos', (): void => {
      expect(normalizeTextForSearch('Íñigo')).toBe(normalizeTextForSearch('inigo'));
    });

    it('convierte null y undefined en texto vacío', (): void => {
      expect(normalizeTextForSearch(null)).toBe('');

      expect(normalizeTextForSearch(undefined)).toBe('');
    });
  });

  describe('trimToNull', (): void => {
    it('elimina espacios exteriores', (): void => {
      expect(trimToNull('  Bilbao  ')).toBe('Bilbao');
    });

    it('convierte un texto vacío en null', (): void => {
      expect(trimToNull('')).toBeNull();

      expect(trimToNull('     ')).toBeNull();
    });

    it('no modifica los espacios interiores', (): void => {
      expect(trimToNull('Gran Vía')).toBe('Gran Vía');
    });

    it('conserva null y convierte undefined en null', (): void => {
      expect(trimToNull(null)).toBeNull();

      expect(trimToNull(undefined)).toBeNull();
    });
  });
});
