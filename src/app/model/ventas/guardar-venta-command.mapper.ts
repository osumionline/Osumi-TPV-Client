import type {
  GuardarVentaCommand,
  GuardarVentaLineaCommand,
  GuardarVentaPagoCommand,
} from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type {
  VentaFinalizacionResultado,
  VentaPagoFinalizado,
} from '@model/ventas/venta-finalizacion-resultado.interface';
import {
  getVentaLineaDescuentoSnapshot,
  type VentaLineaDescuentoSnapshot,
} from '@model/ventas/venta-linea-descuento-snapshot';
import type VentaLineaDevolucionOrigen from '@model/ventas/venta-linea-devolucion-origen.interface';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type VentaLineaReservaOrigen from '@model/ventas/venta-linea-reserva-origen.interface';
import type VentaReservaOrigen from '@model/ventas/venta-reserva-origen.interface';
import { calculateProportionalMicros } from '@utils/money.utils';

/**
 * Convierte la venta viva y su liquidación definitiva
 * en el comando inmutable que cruzará la frontera IPC.
 */
export default function mapVentaToGuardarVentaCommand(
  venta: VentaEnCurso,
  finalizacion: VentaFinalizacionResultado,
  cajaPublicId: string,
): GuardarVentaCommand {
  const normalizedCajaPublicId: string = cajaPublicId.trim();

  if (normalizedCajaPublicId.length === 0) {
    throw new Error('No se puede guardar una venta sin una caja abierta válida.');
  }

  const empleadoPublicId: string = requireEmpleadoPersistido(venta);

  const clientePublicId: string | null = requireClientePersistido(venta);

  if (venta.lineas.length === 0) {
    throw new Error('No se puede guardar una venta sin líneas.');
  }

  if (finalizacion.totalCents !== venta.totalCents) {
    throw new Error('El total de la finalización no coincide con el total actual de la venta.');
  }

  const lineas: readonly GuardarVentaLineaCommand[] = venta.lineas.map(
    (linea: VentaLineaEnCurso): GuardarVentaLineaCommand => mapLinea(linea),
  );

  const pagos: readonly GuardarVentaPagoCommand[] = finalizacion.pagos.map(
    (pago: VentaPagoFinalizado): GuardarVentaPagoCommand => ({
      tipoPagoPublicId: pago.tipoPagoPublicId,
      importeCents: pago.importeCents,
      entregadoCents: pago.entregadoCents,
      cambioCents: pago.cambioCents,
    }),
  );

  const reservasOrigenPublicIds: readonly string[] = venta.reservasOrigen.map(
    (reserva: VentaReservaOrigen): string => reserva.publicId,
  );

  return {
    publicId: venta.idTemporal,
    cajaPublicId: normalizedCajaPublicId,
    empleadoPublicId,
    clientePublicId,
    devolucionVentaOrigenPublicId: venta.devolucionOrigen?.publicId ?? null,
    reservasOrigenPublicIds,
    totalCents: finalizacion.totalCents,
    lineas,
    pagos,
  };
}

function mapLinea(linea: VentaLineaEnCurso): GuardarVentaLineaCommand {
  if (linea.devolucionOrigen !== null && linea.reservaOrigen !== null) {
    throw new Error(
      'Una línea no puede proceder simultáneamente de una devolución y de una reserva.',
    );
  }

  if (linea.devolucionOrigen !== null) {
    return mapLineaDevolucion(linea, linea.devolucionOrigen);
  }

  if (linea.reservaOrigen !== null) {
    return mapLineaReserva(linea, linea.reservaOrigen);
  }

  return mapLineaOrdinaria(linea);
}

function mapLineaOrdinaria(linea: VentaLineaEnCurso): GuardarVentaLineaCommand {
  const discount: VentaLineaDescuentoSnapshot = getVentaLineaDescuentoSnapshot(linea);

  return {
    articuloPublicId: linea.articuloPublicId,
    nombre: linea.descripcion,
    pucMicros: linea.pucMicros,
    pvpMicros: linea.pvpMicros,
    ivaBps: linea.ivaBps,
    importeMicros: linea.importeFinalMicros,
    descuentoBps: discount.descuentoBps,
    importeDescuentoMicros: discount.importeDescuentoMicros,
    unidades: linea.cantidad,
    regalo: linea.regalo,
    devolucionLineaOrigenPublicId: null,
    reservaLineaOrigenPublicId: null,
  };
}

function mapLineaReserva(
  linea: VentaLineaEnCurso,
  origen: VentaLineaReservaOrigen,
): GuardarVentaLineaCommand {
  return {
    articuloPublicId: linea.articuloPublicId,
    nombre: linea.descripcion,
    pucMicros: linea.pucMicros,
    pvpMicros: linea.pvpMicros,
    ivaBps: linea.ivaBps,
    importeMicros: linea.importeFinalMicros,
    descuentoBps: origen.descuentoBps,
    importeDescuentoMicros: linea.importeDescuentoReservaMicros,
    unidades: linea.cantidad,
    regalo: linea.regalo,
    devolucionLineaOrigenPublicId: null,
    reservaLineaOrigenPublicId: origen.lineaPublicId,
  };
}

function mapLineaDevolucion(
  linea: VentaLineaEnCurso,
  origen: VentaLineaDevolucionOrigen,
): GuardarVentaLineaCommand {
  const importeDescuentoMicros: number = getImporteDescuentoDevolucionMicros(linea, origen);

  return {
    articuloPublicId: linea.articuloPublicId,
    nombre: linea.descripcion,
    pucMicros: linea.pucMicros,
    pvpMicros: linea.pvpMicros,
    ivaBps: linea.ivaBps,
    importeMicros: linea.importeFinalMicros,
    descuentoBps: origen.descuentoBps,
    importeDescuentoMicros,
    unidades: linea.cantidad,
    regalo: linea.regalo,
    devolucionLineaOrigenPublicId: origen.publicId,
    reservaLineaOrigenPublicId: null,
  };
}

/**
 * Calcula qué parte del descuento fijo histórico
 * corresponde exactamente a esta devolución.
 *
 * La resta entre acumulados evita que sucesivas
 * devoluciones parciales acumulen errores de redondeo.
 */
function getImporteDescuentoDevolucionMicros(
  linea: VentaLineaEnCurso,
  origen: VentaLineaDevolucionOrigen,
): number {
  const unidadesAntes: number = origen.unidadesDevueltasPrevias;

  const unidadesDespues: number = unidadesAntes + linea.unidadesDevolucion;

  const importeAntes: number = calculateProportionalMicros(
    origen.importeDescuentoMicros,
    unidadesAntes,
    origen.unidadesOriginales,
  );

  const importeDespues: number = calculateProportionalMicros(
    origen.importeDescuentoMicros,
    unidadesDespues,
    origen.unidadesOriginales,
  );

  return importeDespues - importeAntes;
}

function requireEmpleadoPersistido(venta: VentaEnCurso): string {
  const empleado = venta.empleado;

  if (
    empleado === null ||
    empleado.id === null ||
    empleado.publicId === null ||
    empleado.publicId.trim().length === 0
  ) {
    throw new Error('No se puede guardar una venta sin un empleado persistido.');
  }

  return empleado.publicId;
}

function requireClientePersistido(venta: VentaEnCurso): string | null {
  const cliente = venta.cliente;

  if (cliente === null) {
    return null;
  }

  if (cliente.id === null || cliente.publicId === null || cliente.publicId.trim().length === 0) {
    throw new Error('No se puede guardar una venta con un cliente no persistido.');
  }

  return cliente.publicId;
}
