import type MarcaFormModel from '@model/marcas/marca-form.model';

/**
 * Crea una copia independiente de un modelo editable de Marca.
 */
export function cloneMarcaFormModel(model: MarcaFormModel): MarcaFormModel {
  return {
    ...model,
  };
}

/**
 * Comprueba si dos modelos editables representan
 * exactamente el mismo estado persistible de Marca.
 */
export function areMarcaFormModelsEqual(first: MarcaFormModel, second: MarcaFormModel): boolean {
  return (
    first.nombre === second.nombre &&
    first.telefono === second.telefono &&
    first.email === second.email &&
    first.direccion === second.direccion &&
    first.web === second.web &&
    first.observaciones === second.observaciones &&
    first.foto === second.foto
  );
}
