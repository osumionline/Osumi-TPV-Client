import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';

/**
 * Crea el modelo inicial de un Proveedor todavía no persistido.
 */
export default function createProveedorFormInitialValue(): ProveedorFormModel {
  return {
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    web: '',
    observaciones: '',
    foto: null,
    marcas: [],
  };
}
