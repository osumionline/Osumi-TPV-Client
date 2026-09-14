import type MarcaFormModel from '@model/marcas/marca-form.model';

/**
 * Crea el modelo inicial de una Marca todavía no persistida.
 */
export default function createMarcaFormInitialValue(): MarcaFormModel {
  return {
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    web: '',
    observaciones: '',
    foto: null,
  };
}
