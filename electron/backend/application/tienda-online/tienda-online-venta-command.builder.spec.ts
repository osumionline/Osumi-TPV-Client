import type { TiendaOnlinePedidoConLineas } from '@backend/application/tienda-online/tienda-online-pedidos.service';
import type { TiendaOnlineImportacionContexto } from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import TiendaOnlineVentaCommandBuilder from '@backend/application/tienda-online/tienda-online-venta-command.builder';
import type { TiendaOnlinePedidoPendiente } from '@backend/contracts/tienda-online/tienda-online-pedidos-pendientes.interface';
import type TipoPagoRepository from '@backend/contracts/tipos-pago/tipo-pago.repository.interface';
import type GuardarVentaOnlineRecordCommand from '@backend/contracts/ventas/guardar-venta-online-record-command.interface';
import type TipoPagoRecord from '@backend/domain/tipos-pago/tipo-pago-record.interface';
import { describe, expect, it } from 'vitest';

const tiposPago: readonly TipoPagoRecord[] = [
  {
    id: 1,
    publicId: 'tipo-pago-visa',
    nombre: 'Visa',
    slug: 'visa',
    fotoRelativePath: null,
    afectaCaja: false,
    orden: 1,
    fisico: true,
  },
  {
    id: 2,
    publicId: 'tipo-pago-efectivo',
    nombre: 'Efectivo',
    slug: 'efectivo',
    fotoRelativePath: null,
    afectaCaja: true,
    orden: 0,
    fisico: true,
  },
];

/** Repositorio de pago controlado, sin acceso a SQLite. */
const pagosRepository: Pick<TipoPagoRepository, 'findAll'> = {
  findAll(): Promise<readonly TipoPagoRecord[]> {
    return Promise.resolve(tiposPago);
  },
};

/** Crea el constructor con una fuente y equivalencias explícitas. */
function createBuilder(
  overrides: Partial<TiendaOnlineImportacionContexto> = {},
): TiendaOnlineVentaCommandBuilder {
  return new TiendaOnlineVentaCommandBuilder(pagosRepository, {
    fuenteId: 'tienda-prueba-1',
    zonaHoraria: 'Europe/Madrid',
    metodosPago: {
      cards: 'visa',
    },
    ...overrides,
  });
}

/** Pedido cuyas líneas comerciales ya están preparadas. */
function createPrepared(
  overrides: Partial<TiendaOnlinePedidoPendiente> = {},
): TiendaOnlinePedidoConLineas {
  const order: TiendaOnlinePedidoPendiente = {
    id: 42,
    reference: 'ORDER-42',
    paidAt: '2026-11-13 10:30:00',
    paymentMethod: 'cards',
    productsTotalCents: 1_000,
    shippingCents: 0,
    shippingVatBps: null,
    totalCents: 1_000,
    items: [
      {
        productId: 10,
        sizeId: 0,
        colorId: 0,
        quantity: 1,
        name: 'Artículo',
        brand: 'Marca',
        localizador: '000123',
        ivaBps: 2_100,
        amountBeforeCents: 1_000,
        discountCents: 0,
        lineTotalCents: 1_000,
      },
    ],
    ...overrides,
  };

  return {
    status: 'lines-ready',
    order,
    lineas: [
      {
        articuloPublicId: 'articulo-123',
        localizador: 123,
        nombre: 'Artículo',
        marca: 'Marca',
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
  };
}

describe('TiendaOnlineVentaCommandBuilder', (): void => {
  it('construye una venta comercial completa', async (): Promise<void> => {
    const command: GuardarVentaOnlineRecordCommand = await createBuilder().build(createPrepared());

    expect(command.publicId).toMatch(/^venta-online-[a-f0-9]{64}$/);
    expect(command.referenciaExterna).toMatch(/^tienda-online-[a-f0-9]{64}$/);

    expect(command.pagadaAt).toBe('2026-11-13T09:30:00.000Z');
    expect(command.totalCents).toBe(1_000);
    expect(command.lineas).toHaveLength(1);

    expect(command.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-visa',
        importeCents: 1_000,
        entregadoCents: null,
        cambioCents: 0,
      },
    ]);
  });

  it('genera una identidad estable por fuente y referencia', async (): Promise<void> => {
    const first = await createBuilder().build(createPrepared());
    const retry = await createBuilder().build(createPrepared());

    expect(retry.publicId).toBe(first.publicId);
    expect(retry.referenciaExterna).toBe(first.referenciaExterna);

    const otherStore = await createBuilder({
      fuenteId: 'tienda-prueba-2',
    }).build(createPrepared());

    expect(otherStore.publicId).not.toBe(first.publicId);
    expect(otherStore.referenciaExterna).not.toBe(first.referenciaExterna);
  });

  it('incorpora el transporte con su IVA explícito', async (): Promise<void> => {
    const command = await createBuilder().build(
      createPrepared({
        shippingCents: 450,
        shippingVatBps: 1_000,
        totalCents: 1_450,
      }),
    );

    expect(command.lineas).toHaveLength(2);
    expect(command.totalCents).toBe(1_450);

    expect(command.lineas[1]).toMatchObject({
      articuloPublicId: null,
      localizador: 0,
      nombre: 'Gastos de envío',
      ivaBps: 1_000,
      unidades: 1,
      pvpMicros: 4_500_000,
      importeMicros: 4_500_000,
    });

    expect(command.pagos[0]?.importeCents).toBe(1_450);
  });

  it('bloquea portes cuyo IVA no está acreditado', async (): Promise<void> => {
    await expect(
      createBuilder().build(
        createPrepared({
          shippingCents: 450,
          totalCents: 1_450,
        }),
      ),
    ).rejects.toThrow('Los gastos de envío no tienen un IVA histórico válido.');
  });

  it('rechaza métodos sin equivalencia explícita', async (): Promise<void> => {
    await expect(
      createBuilder({
        metodosPago: {},
      }).build(createPrepared()),
    ).rejects.toThrow('No existe equivalencia de pago');
  });

  it('rechaza tipos de pago locales no disponibles', async (): Promise<void> => {
    await expect(
      createBuilder({
        metodosPago: { cards: 'no-existe' },
      }).build(createPrepared()),
    ).rejects.toThrow('no está disponible para guardar la venta');
  });

  it('representa correctamente un cobro en efectivo explícito', async (): Promise<void> => {
    const command = await createBuilder({
      metodosPago: { cards: 'efectivo' },
    }).build(createPrepared());

    expect(command.pagos).toEqual([
      {
        tipoPagoPublicId: 'tipo-pago-efectivo',
        importeCents: 1_000,
        entregadoCents: 1_000,
        cambioCents: 0,
      },
    ]);
  });

  it('interpreta correctamente el horario de verano', async (): Promise<void> => {
    const command = await createBuilder().build(
      createPrepared({
        paidAt: '2026-07-13 10:30:00',
      }),
    );

    expect(command.pagadaAt).toBe('2026-07-13T08:30:00.000Z');
  });

  it('rechaza horas inexistentes en primavera', async (): Promise<void> => {
    await expect(
      createBuilder().build(
        createPrepared({
          paidAt: '2026-03-29 02:30:00',
        }),
      ),
    ).rejects.toThrow('inexistente o ambigua');
  });

  it('rechaza horas duplicadas en otoño', async (): Promise<void> => {
    await expect(
      createBuilder().build(
        createPrepared({
          paidAt: '2026-10-25 02:30:00',
        }),
      ),
    ).rejects.toThrow('inexistente o ambigua');
  });

  it('rechaza zonas horarias no válidas', async (): Promise<void> => {
    await expect(
      createBuilder({
        zonaHoraria: 'Zona/Desconocida',
      }).build(createPrepared()),
    ).rejects.toThrow('La zona horaria de la tienda online no es válida.');
  });
});
