import type ComercialFormModel from '@model/proveedores/comercial-form.model';

/**
 * Crea una copia independiente del modelo editable de Comercial.
 */
export function cloneComercialFormModel(model: ComercialFormModel): ComercialFormModel {
  return {
    ...model,
  };
}

/**
 * Comprueba si dos modelos editables representan
 * exactamente el mismo estado persistible del Comercial.
 */
export function areComercialFormModelsEqual(
  first: ComercialFormModel,
  second: ComercialFormModel,
): boolean {
  return (
    first.nombre === second.nombre &&
    first.telefono === second.telefono &&
    first.email === second.email &&
    first.observaciones === second.observaciones
  );
}
