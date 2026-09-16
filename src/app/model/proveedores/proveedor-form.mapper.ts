import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import type Proveedor from '@model/proveedores/proveedor.model';

/**
 * Convierte un Proveedor canónico en su modelo editable.
 */
export default function createProveedorFormModel(proveedor: Proveedor): ProveedorFormModel {
  return {
    nombre: proveedor.nombre,
    telefono: proveedor.telefono ?? '',
    email: proveedor.email ?? '',
    direccion: proveedor.direccion ?? '',
    web: proveedor.web ?? '',
    observaciones: proveedor.observaciones ?? '',
    foto: proveedor.foto,
    marcas: [...proveedor.marcas],
  };
}
