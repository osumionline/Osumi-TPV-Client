/**
 * Número de céntimos contenidos en un euro.
 */
export const CENTS_PER_EURO: number = 100;

/**
 * Número de microeuros contenidos en un céntimo.
 */
export const MICROS_PER_CENT: number = 10_000;

/**
 * Número de microeuros contenidos en un euro.
 */
export const MICROS_PER_EURO: number = CENTS_PER_EURO * MICROS_PER_CENT;
