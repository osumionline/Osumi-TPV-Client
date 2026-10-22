import VentaOnlineCommandValidator from '@backend/application/ventas/venta-online-command.validator';
import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import { describe, expect, it } from 'vitest';

describe('VentaOnlineCommandValidator', (): void => {
  const validator: VentaOnlineCommandValidator = new VentaOnlineCommandValidator();

  it('acepta una venta online económicamente coherente', (): void => {
    expect((): void => {
      validator.validate(createValidCommand());
    }).not.toThrow();
  });

  it('rechaza líneas cuyo total no coincide con la venta', (): void => {
    const command: GuardarVentaOnlineRecordCommand = {
      ...createValidCommand(),
      totalCents: 1_100,
    };

    expect((): void => {
      validator.validate(command);
    }).toThrow('El total de las líneas online no coincide con el total de la venta.');
  });

  it('rechaza pagos que no liquidan exactamente la venta', (): void => {
    const command: GuardarVentaOnlineRecordCommand = {
      ...createValidCommand(),
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          importeCents: 900,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
    };

    expect((): void => {
      validator.validate(command);
    }).toThrow('La suma de los pagos online no coincide con el total de la venta.');
  });

  it('rechaza unidades negativas y devoluciones', (): void => {
    const base: GuardarVentaOnlineRecordCommand = createValidCommand();
    const linea = base.lineas[0];

    if (linea === undefined) {
      throw new Error('Falta la línea del fixture.');
    }

    expect((): void => {
      validator.validate({
        ...base,
        lineas: [
          {
            ...linea,
            unidades: -1,
          },
        ],
      });
    }).toThrow('Las unidades de una línea online no son válidas.');

    expect((): void => {
      validator.validate({
        ...base,
        lineas: [
          {
            ...linea,
            devolucionLineaOrigenPublicId: 'linea-original',
          },
        ],
      });
    }).toThrow('Una venta online importada no puede incluir devoluciones ni reservas.');
  });

  it('rechaza importes fuera del rango numérico seguro', (): void => {
    const base: GuardarVentaOnlineRecordCommand = createValidCommand();
    const linea = base.lineas[0];

    if (linea === undefined) {
      throw new Error('Falta la línea del fixture.');
    }

    expect((): void => {
      validator.validate({
        ...base,
        lineas: [
          {
            ...linea,
            importeMicros: Number.MAX_SAFE_INTEGER + 1,
          },
        ],
      });
    }).toThrow('Los importes de una línea online no son válidos.');

    expect((): void => {
      validator.validate({
        ...base,
        totalCents: Number.MAX_SAFE_INTEGER + 1,
      });
    }).toThrow('El total de la venta online no es válido.');
  });

  it('rechaza descuentos incompatibles y regalos con importe', (): void => {
    const base: GuardarVentaOnlineRecordCommand = createValidCommand();
    const linea = base.lineas[0];

    if (linea === undefined) {
      throw new Error('Falta la línea del fixture.');
    }

    expect((): void => {
      validator.validate({
        ...base,
        lineas: [
          {
            ...linea,
            descuentoBps: 1_000,
            importeDescuentoMicros: 100_000,
          },
        ],
      });
    }).toThrow('Una línea online no puede combinar descuento porcentual y fijo.');

    expect((): void => {
      validator.validate({
        ...base,
        lineas: [
          {
            ...linea,
            regalo: true,
          },
        ],
      });
    }).toThrow('Una línea online marcada como regalo debe tener importe cero.');
  });

  it('rechaza tipos de pago repetidos', (): void => {
    const command: GuardarVentaOnlineRecordCommand = {
      ...createValidCommand(),
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          importeCents: 500,
          entregadoCents: null,
          cambioCents: 0,
        },
        {
          tipoPagoPublicId: 'tipo-pago-tarjeta',
          importeCents: 500,
          entregadoCents: null,
          cambioCents: 0,
        },
      ],
    };

    expect((): void => {
      validator.validate(command);
    }).toThrow('Una venta online no puede repetir el mismo tipo de pago.');
  });

  it('rechaza pagos con entrega y cambio inconsistentes', (): void => {
    const command: GuardarVentaOnlineRecordCommand = {
      ...createValidCommand(),
      pagos: [
        {
          tipoPagoPublicId: 'tipo-pago-efectivo',
          importeCents: 1_000,
          entregadoCents: 1_500,
          cambioCents: 200,
        },
      ],
    };

    expect((): void => {
      validator.validate(command);
    }).toThrow('El importe entregado y el cambio de un pago online no cuadran.');
  });

  it('permite una venta de importe cero sin pagos', (): void => {
    const base: GuardarVentaOnlineRecordCommand = createValidCommand();
    const linea = base.lineas[0];

    if (linea === undefined) {
      throw new Error('Falta la línea del fixture.');
    }

    expect((): void => {
      validator.validate({
        ...base,
        totalCents: 0,
        lineas: [
          {
            ...linea,
            importeMicros: 0,
            regalo: true,
          },
        ],
        pagos: [],
      });
    }).not.toThrow();
  });

  it('rechaza una venta de importe cero con pagos', (): void => {
    const base: GuardarVentaOnlineRecordCommand = createValidCommand();
    const linea = base.lineas[0];

    if (linea === undefined) {
      throw new Error('Falta la línea del fixture.');
    }

    expect((): void => {
      validator.validate({
        ...base,
        totalCents: 0,
        lineas: [
          {
            ...linea,
            importeMicros: 0,
            regalo: true,
          },
        ],
      });
    }).toThrow('Una venta online de total cero no debe contener pagos.');
  });
});

/**
 * Crea un pedido online interno coherente, con un
 * artículo de 10 euros y un pago por el mismo valor.
 */
function createValidCommand(): GuardarVentaOnlineRecordCommand {
  return {
    publicId: 'venta-online-validador',
    referenciaExterna: 'pedido-online-validador',
    pagadaAt: '2026-10-20T10:30:00.000Z',
    totalCents: 1_000,
    lineas: [
      {
        articuloPublicId: 'articulo-1',
        localizador: 1,
        marca: 'Marca test',
        nombre: 'Artículo de prueba',
        pucMicros: 4_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 10_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ],
    pagos: [
      {
        tipoPagoPublicId: 'tipo-pago-tarjeta',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ],
  };
}
