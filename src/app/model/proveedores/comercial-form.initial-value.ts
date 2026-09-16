import type ComercialFormModel from '@model/proveedores/comercial-form.model';

/**
 * Crea el modelo inicial de un Comercial todavía no persistido.
 */
export default function createComercialFormInitialValue(): ComercialFormModel {
  return {
    nombre: '',
    telefono: '',
    email: '',
    observaciones: '',
  };
}
