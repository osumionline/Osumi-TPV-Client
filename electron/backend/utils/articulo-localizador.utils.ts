import { randomInt } from 'node:crypto';

type ArticuloLocalizadorOccupiedChecker = (localizador: number) => Promise<boolean>;

const LOCALIZADOR_SEQUENCE_MIN: number = 1;
const LOCALIZADOR_SEQUENCE_MAX: number = 9999;

/**
 * Genera un localizador siguiendo el formato legacy:
 * dos cifras de año más cuatro cifras aleatorias.
 *
 * Si el primer candidato está ocupado recorre el resto
 * de posibilidades del año sin repetir candidatos.
 */
export async function generateArticuloLocalizador(
  isOccupied: ArticuloLocalizadorOccupiedChecker,
  currentDate: Date = new Date(),
  firstSequence: number = randomInt(LOCALIZADOR_SEQUENCE_MIN, LOCALIZADOR_SEQUENCE_MAX + 1),
): Promise<number> {
  const year: number = currentDate.getFullYear() % 100;
  const prefix: number = year * 10_000;

  for (let offset: number = 0; offset < LOCALIZADOR_SEQUENCE_MAX; offset++) {
    const sequence: number = ((firstSequence - 1 + offset) % LOCALIZADOR_SEQUENCE_MAX) + 1;
    const localizador: number = prefix + sequence;

    if (!(await isOccupied(localizador))) {
      return localizador;
    }
  }

  throw new Error(`No quedan localizadores disponibles para el año ${currentDate.getFullYear()}.`);
}
