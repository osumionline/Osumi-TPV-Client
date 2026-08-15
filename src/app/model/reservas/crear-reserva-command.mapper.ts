import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type { CrearReservaLineaCommand } from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';

interface ReservaDiscountSnapshot {
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
}

/**
 * Convierte una venta ordinaria en el snapshot económico
 * necesario para crear una reserva.
 */
export default function mapVentaToCrearReservaCommand(venta: VentaEnCurso): CrearReservaCommand {
  const clientePublicId: string | null = venta.cliente?.publicId ?? null;

  if (clientePublicId === null) {
    throw new Error('Para crear una reserva es obligatorio seleccionar un cliente.');
  }

  if (
    venta.devolucionOrigen !== null ||
    venta.lineas.some((linea: VentaLineaEnCurso): boolean => linea.esDevolucion)
  ) {
    throw new Error('No se puede crear una reserva desde una venta que contiene devoluciones.');
  }

  if (
    venta.tieneReservas ||
    venta.lineas.some((linea: VentaLineaEnCurso): boolean => linea.esReserva)
  ) {
    throw new Error(
      'No se puede crear una nueva reserva desde una venta que ya procede de reservas.',
    );
  }

  if (venta.lineas.length === 0) {
    throw new Error('No se puede crear una reserva sin líneas.');
  }

  const lineas: CrearReservaLineaCommand[] = venta.lineas.map(
    (linea: VentaLineaEnCurso): CrearReservaLineaCommand => {
      if (!Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0) {
        throw new RangeError('Las líneas de una reserva deben tener una cantidad positiva.');
      }

      const discount: ReservaDiscountSnapshot = getDiscountSnapshot(linea);

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
      };
    },
  );

  return {
    clientePublicId,
    lineas,
  };
}

/**
 * Conserva la forma histórica del descuento:
 *
 * - porcentaje → descuento_bps
 * - promocional/directo/manual/regalo → importe fijo
 */
function getDiscountSnapshot(linea: VentaLineaEnCurso): ReservaDiscountSnapshot {
  if (linea.regalo) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.importeBaseMicros,
    };
  }

  if (linea.importeManualMicros !== null) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: Math.max(linea.importeBaseMicros - linea.importeFinalMicros, 0),
    };
  }

  if (linea.tieneDescuentoPromocional) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.importeDescuentoPromocionalMicros,
    };
  }

  if (linea.descuentoDirectoMicros !== null) {
    return {
      descuentoBps: 0,
      importeDescuentoMicros: linea.descuentoDirectoMicros,
    };
  }

  return {
    descuentoBps: linea.descuentoBps,
    importeDescuentoMicros: 0,
  };
}
