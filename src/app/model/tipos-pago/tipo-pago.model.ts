import type TipoPagoInterface from '@desktop-contracts/tipos-pago/tipo-pago.interface';

/**
 * Representa una forma de pago disponible para la operativa del TPV.
 */
export default class TipoPago {
  id: number | null = null;
  publicId: string | null = null;
  nombre: string = '';
  slug: string = '';
  foto: string | null = null;
  afectaCaja: boolean = false;
  orden: number = 0;
  fisico: boolean = true;

  /**
   * Carga el modelo a partir del contrato recibido desde Electron.
   */
  fromInterface(tipoPago: TipoPagoInterface): TipoPago {
    this.id = tipoPago.id;
    this.publicId = tipoPago.publicId;
    this.nombre = tipoPago.nombre;
    this.slug = tipoPago.slug;
    this.foto = tipoPago.foto;
    this.afectaCaja = tipoPago.afectaCaja;
    this.orden = tipoPago.orden;
    this.fisico = tipoPago.fisico;

    return this;
  }

  /**
   * Convierte el modelo persistido en su contrato público.
   */
  toInterface(): TipoPagoInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir un tipo de pago no persistido a TipoPagoInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      nombre: this.nombre,
      slug: this.slug,
      foto: this.foto,
      afectaCaja: this.afectaCaja,
      orden: this.orden,
      fisico: this.fisico,
    };
  }
}
