import type ComercialFormModel from '@model/proveedores/comercial-form.model';
import type Comercial from '@model/proveedores/comercial.model';

/**
 * Convierte un Comercial canónico en su modelo editable.
 */
export default function createComercialFormModel(comercial: Comercial): ComercialFormModel {
  return {
    nombre: comercial.nombre,
    telefono: comercial.telefono ?? '',
    email: comercial.email ?? '',
    observaciones: comercial.observaciones ?? '',
  };
}
