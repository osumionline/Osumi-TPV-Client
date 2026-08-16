import { getErrorMessage } from '@utils/error.utils';

describe('error.utils', (): void => {
  it('devuelve el mensaje de una instancia de Error', (): void => {
    expect(getErrorMessage(new Error('Error de prueba.'))).toBe('Error de prueba.');
  });

  it('conserva el mensaje del Error aunque exista un fallback', (): void => {
    expect(getErrorMessage(new RangeError('Valor no válido.'), 'Error alternativo.')).toBe(
      'Valor no válido.',
    );
  });

  it('utiliza el fallback para valores que no sean Error', (): void => {
    expect(getErrorMessage('Error recibido como texto.', 'Error alternativo.')).toBe(
      'Error alternativo.',
    );

    expect(getErrorMessage(null, 'Error alternativo.')).toBe('Error alternativo.');
  });

  it('convierte mediante String los valores sin fallback', (): void => {
    expect(getErrorMessage('Error recibido como texto.')).toBe('Error recibido como texto.');

    expect(getErrorMessage(123)).toBe('123');

    expect(getErrorMessage(null)).toBe('null');
  });

  it('no sustituye un mensaje vacío de Error por el fallback', (): void => {
    expect(getErrorMessage(new Error(''), 'Error alternativo.')).toBe('');
  });
});
