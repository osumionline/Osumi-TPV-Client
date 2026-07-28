import type Caja from '@backend/domain/caja/caja.interface';
import { EntitySchema } from 'typeorm';

const cajaSchema: EntitySchema<Caja> = new EntitySchema<Caja>({
  name: 'Caja',
  tableName: 'caja',

  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },

    apertura: {
      type: Date,
    },

    cierre: {
      type: Date,
      nullable: true,
    },

    ventasCents: {
      name: 'ventas_cents',
      type: Number,
      default: 0,
    },

    beneficiosCents: {
      name: 'beneficios_cents',
      type: Number,
      default: 0,
    },

    ventaEfectivoCents: {
      name: 'venta_efectivo_cents',
      type: Number,
      default: 0,
    },

    operacionesEfectivo: {
      name: 'operaciones_efectivo',
      type: Number,
      default: 0,
    },

    descuentoEfectivoCents: {
      name: 'descuento_efectivo_cents',
      type: Number,
      default: 0,
    },

    ventaOtrosCents: {
      name: 'venta_otros_cents',
      type: Number,
      default: 0,
    },

    operacionesOtros: {
      name: 'operaciones_otros',
      type: Number,
      default: 0,
    },

    descuentoOtrosCents: {
      name: 'descuento_otros_cents',
      type: Number,
      default: 0,
    },

    importePagosCajaCents: {
      name: 'importe_pagos_caja_cents',
      type: Number,
      default: 0,
    },

    numPagosCaja: {
      name: 'num_pagos_caja',
      type: Number,
      default: 0,
    },

    importeAperturaCents: {
      name: 'importe_apertura_cents',
      type: Number,
      default: 0,
    },

    importeCierreCents: {
      name: 'importe_cierre_cents',
      type: Number,
      default: 0,
    },

    importeCierreRealCents: {
      name: 'importe_cierre_real_cents',
      type: Number,
      default: 0,
    },

    importeRetiradoCents: {
      name: 'importe_retirado_cents',
      type: Number,
      default: 0,
    },

    createdAt: {
      name: 'created_at',
      type: Date,
      createDate: true,
    },

    updatedAt: {
      name: 'updated_at',
      type: Date,
      updateDate: true,
    },
  },
});

export default cajaSchema;
