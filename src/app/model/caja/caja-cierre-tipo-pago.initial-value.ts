import type { CajaCierreTipoPagoInterface } from '@desktop-contracts/caja/caja-cierre.interface';
import type CajaCierreTipoPagoModel from '@model/caja/caja-cierre-tipo-pago.model';

/**
 * Construye el estado editable inicial de un tipo de pago
 * a partir del snapshot canónico del cierre.
 */
export default function createCajaCierreTipoPagoInitialValue(
  tipoPago: CajaCierreTipoPagoInterface,
): CajaCierreTipoPagoModel {
  return {
    publicId: tipoPago.publicId,
    nombre: tipoPago.nombre,
    slug: tipoPago.slug,
    afectaCaja: tipoPago.afectaCaja,
    orden: tipoPago.orden,
    operaciones: tipoPago.operaciones,
    importeVentasCents: tipoPago.importeVentasCents,
    importeRealCents: tipoPago.importeVentasCents,
    expanded: false,
  };
}
