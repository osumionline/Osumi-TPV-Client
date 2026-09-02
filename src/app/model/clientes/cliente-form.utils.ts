import type ClienteFormModel from '@model/clientes/cliente-form.model';

type ClienteFormField = keyof ClienteFormModel;

/**
 * Crea una copia independiente del modelo editable de cliente.
 */
export function cloneClienteFormModel(model: ClienteFormModel): ClienteFormModel {
  return {
    ...model,
  };
}

/**
 * Compara todos los campos editables de dos modelos de cliente.
 */
export function areClienteFormModelsEqual(
  first: ClienteFormModel,
  second: ClienteFormModel,
): boolean {
  const fields: readonly ClienteFormField[] = Object.keys(first) as ClienteFormField[];
  const secondFields: readonly string[] = Object.keys(second);

  return (
    fields.length === secondFields.length &&
    fields.every((field: ClienteFormField): boolean => first[field] === second[field])
  );
}
