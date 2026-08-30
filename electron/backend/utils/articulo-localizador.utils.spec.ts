import { generateArticuloLocalizador } from '@backend/utils/articulo-localizador.utils';
import { describe, expect, it } from 'vitest';

describe('generateArticuloLocalizador', (): void => {
  it('genera el formato YYxxxx', async (): Promise<void> => {
    const localizador: number = await generateArticuloLocalizador(
      async (): Promise<boolean> => false,
      new Date('2026-08-30T12:00:00.000Z'),
      123,
    );

    expect(localizador).toBe(260123);
  });

  it('continúa buscando cuando el primer candidato está ocupado', async (): Promise<void> => {
    const occupied: Set<number> = new Set<number>([269998, 269999]);

    const localizador: number = await generateArticuloLocalizador(
      async (candidate: number): Promise<boolean> => occupied.has(candidate),
      new Date('2026-08-30T12:00:00.000Z'),
      9998,
    );

    expect(localizador).toBe(260001);
  });

  it('falla si están agotadas todas las combinaciones del año', async (): Promise<void> => {
    await expect(
      generateArticuloLocalizador(
        async (): Promise<boolean> => true,
        new Date('2026-08-30T12:00:00.000Z'),
        1,
      ),
    ).rejects.toThrow('No quedan localizadores disponibles para el año 2026.');
  });
});
