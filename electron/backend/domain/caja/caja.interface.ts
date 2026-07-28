export default interface Caja {
  id: number;

  apertura: Date;
  cierre: Date | null;

  ventasCents: number;
  beneficiosCents: number;

  ventaEfectivoCents: number;
  operacionesEfectivo: number;
  descuentoEfectivoCents: number;

  ventaOtrosCents: number;
  operacionesOtros: number;
  descuentoOtrosCents: number;

  importePagosCajaCents: number;
  numPagosCaja: number;

  importeAperturaCents: number;
  importeCierreCents: number;
  importeCierreRealCents: number;
  importeRetiradoCents: number;

  createdAt: Date;
  updatedAt: Date;
}
