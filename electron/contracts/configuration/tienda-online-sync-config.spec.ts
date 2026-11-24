import {
  formatTiendaOnlineMetodosPago,
  isTiendaOnlineSyncConfig,
  isTiendaOnlineZonaHoraria,
  parseTiendaOnlineMetodosPago,
  type TiendaOnlineSyncConfig,
} from '@desktop-contracts/configuration/tienda-online-sync-config';
import { describe, expect, it } from 'vitest';

/** Perfil completo de una tienda configurada. */
function createConfig(): TiendaOnlineSyncConfig {
  return {
    fuenteId: 'tienda-principal',
    zonaHoraria: 'Europe/Madrid',
    metodosPago: {
      cards: 'visa',
      paypal: 'paypal',
    },
    politicaAck: 'aceptada-o-no-aplica',
  };
}

describe('TiendaOnlineSyncConfig', (): void => {
  it('acepta una configuración operativa completa', (): void => {
    expect(isTiendaOnlineSyncConfig(createConfig())).toBe(true);
  });

  it('convierte equivalencias de texto y las recupera', (): void => {
    const methods = parseTiendaOnlineMetodosPago('cards=visa\npaypal=paypal');

    expect(methods).toEqual({
      cards: 'visa',
      paypal: 'paypal',
    });

    expect(formatTiendaOnlineMetodosPago(methods ?? {})).toBe('cards=visa\npaypal=paypal');
  });

  it('rechaza equivalencias incompletas o repetidas', (): void => {
    expect(parseTiendaOnlineMetodosPago('')).toBeNull();
    expect(parseTiendaOnlineMetodosPago('cards')).toBeNull();
    expect(parseTiendaOnlineMetodosPago('cards=')).toBeNull();
    expect(parseTiendaOnlineMetodosPago('cards=visa\ncards=efectivo')).toBeNull();
  });

  it('rechaza una identidad o política no válida', (): void => {
    expect(
      isTiendaOnlineSyncConfig({
        ...createConfig(),
        fuenteId: 'tienda con espacios',
      }),
    ).toBe(false);

    expect(
      isTiendaOnlineSyncConfig({
        ...createConfig(),
        politicaAck: 'cualquier-estado',
      }),
    ).toBe(false);
  });

  it('rechaza zonas horarias desconocidas', (): void => {
    expect(isTiendaOnlineZonaHoraria('Europe/Madrid')).toBe(true);
    expect(isTiendaOnlineZonaHoraria('Zona/Inexistente')).toBe(false);
  });

  it('rechaza configuraciones sin equivalencias de pago', (): void => {
    expect(
      isTiendaOnlineSyncConfig({
        ...createConfig(),
        metodosPago: {},
      }),
    ).toBe(false);
  });
});
