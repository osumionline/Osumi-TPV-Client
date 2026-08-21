import type { VentaTicketLineaInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import {
  buildVentaTicketIvaResumen,
  type VentaTicketIvaResumen,
} from '@model/ventas/venta-ticket-iva.utils';

describe('buildVentaTicketIvaResumen', (): void => {
  it('agrupa las líneas por IVA y calcula base y cuota', (): void => {
    const lineas: readonly VentaTicketLineaInterface[] = [
      createLinea({
        ivaBps: 2_100,
        importeMicros: 12_100_000,
      }),
      createLinea({
        ivaBps: 1_000,
        importeMicros: 11_000_000,
      }),
    ];

    const resumen: readonly VentaTicketIvaResumen[] = buildVentaTicketIvaResumen(lineas);

    expect(resumen).toEqual([
      {
        ivaBps: 2_100,
        importeMicros: 12_100_000,
        baseMicros: 10_000_000,
        cuotaMicros: 2_100_000,
      },
      {
        ivaBps: 1_000,
        importeMicros: 11_000_000,
        baseMicros: 10_000_000,
        cuotaMicros: 1_000_000,
      },
    ]);
  });

  it('mantiene el signo al compensar una devolución', (): void => {
    const lineas: readonly VentaTicketLineaInterface[] = [
      createLinea({
        ivaBps: 2_100,
        importeMicros: 12_100_000,
      }),
      createLinea({
        ivaBps: 2_100,
        importeMicros: -6_050_000,
        unidades: -1,
      }),
    ];

    const resumen: readonly VentaTicketIvaResumen[] = buildVentaTicketIvaResumen(lineas);

    expect(resumen).toEqual([
      {
        ivaBps: 2_100,
        importeMicros: 6_050_000,
        baseMicros: 5_000_000,
        cuotaMicros: 1_050_000,
      },
    ]);
  });

  it('conserva correctamente un tipo de IVA del 0 %', (): void => {
    const lineas: readonly VentaTicketLineaInterface[] = [
      createLinea({
        ivaBps: 0,
        importeMicros: 8_000_000,
      }),
    ];

    const resumen: readonly VentaTicketIvaResumen[] = buildVentaTicketIvaResumen(lineas);

    expect(resumen).toEqual([
      {
        ivaBps: 0,
        importeMicros: 8_000_000,
        baseMicros: 8_000_000,
        cuotaMicros: 0,
      },
    ]);
  });
});

function createLinea(overrides: Partial<VentaTicketLineaInterface>): VentaTicketLineaInterface {
  return {
    nombre: 'Artículo',
    pvpMicros: 12_100_000,
    ivaBps: 2_100,
    importeMicros: 12_100_000,
    descuentoBps: 0,
    importeDescuentoMicros: 0,
    unidades: 1,
    regalo: false,
    ...overrides,
  };
}
