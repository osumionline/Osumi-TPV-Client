import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';

/**
 * Crea una copia independiente del modelo editable de Proveedor.
 */
export function cloneProveedorFormModel(model: ProveedorFormModel): ProveedorFormModel {
  return {
    ...model,
    marcas: [...model.marcas],
  };
}

/**
 * Comprueba si dos modelos editables representan
 * exactamente el mismo estado persistible del Proveedor.
 */
export function areProveedorFormModelsEqual(
  first: ProveedorFormModel,
  second: ProveedorFormModel,
): boolean {
  return (
    first.nombre === second.nombre &&
    first.telefono === second.telefono &&
    first.email === second.email &&
    first.direccion === second.direccion &&
    first.web === second.web &&
    first.observaciones === second.observaciones &&
    first.foto === second.foto &&
    areMarcaCollectionsEqual(first.marcas, second.marcas)
  );
}

/**
 * Compara dos selecciones de Marcas por pertenencia,
 * sin considerar el orden visual de sus identificadores.
 */
function areMarcaCollectionsEqual(first: readonly number[], second: readonly number[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const firstSorted: readonly number[] = [...first].sort(
    (left: number, right: number): number => left - right,
  );

  const secondSorted: readonly number[] = [...second].sort(
    (left: number, right: number): number => left - right,
  );

  return firstSorted.every(
    (idMarca: number, index: number): boolean => idMarca === secondSorted[index],
  );
}
