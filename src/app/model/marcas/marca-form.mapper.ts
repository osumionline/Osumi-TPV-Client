import type MarcaFormModel from '@model/marcas/marca-form.model';
import type Marca from '@model/marcas/marca.model';

/**
 * Convierte una Marca canónica en su modelo editable.
 */
export default function createMarcaFormModel(marca: Marca): MarcaFormModel {
  return {
    nombre: marca.nombre,
    telefono: marca.telefono ?? '',
    email: marca.email ?? '',
    direccion: marca.direccion ?? '',
    web: marca.web ?? '',
    observaciones: marca.observaciones ?? '',
    foto: marca.foto,
  };
}
