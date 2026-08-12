import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type ClienteFormModel from '@model/clientes/cliente-form.model';

export default function createClienteCommand(model: ClienteFormModel): CrearClienteCommand {
  return {
    nombreApellidos: model.nombreApellidos.trim(),
    dniCif: normalizeOptionalText(model.dniCif),
    telefono: normalizeOptionalText(model.telefono),
    email: normalizeOptionalText(model.email),

    direccion: normalizeOptionalText(model.direccion),
    codigoPostal: normalizeOptionalText(model.codigoPostal),
    poblacion: normalizeOptionalText(model.poblacion),
    provincia: normalizeOptionalProvince(model.provincia),

    factIgual: model.factIgual,
    factNombreApellidos: model.factIgual ? null : normalizeOptionalText(model.factNombreApellidos),
    factDniCif: model.factIgual ? null : normalizeOptionalText(model.factDniCif),
    factTelefono: model.factIgual ? null : normalizeOptionalText(model.factTelefono),
    factEmail: model.factIgual ? null : normalizeOptionalText(model.factEmail),
    factDireccion: model.factIgual ? null : normalizeOptionalText(model.factDireccion),
    factCodigoPostal: model.factIgual ? null : normalizeOptionalText(model.factCodigoPostal),
    factPoblacion: model.factIgual ? null : normalizeOptionalText(model.factPoblacion),
    factProvincia: model.factIgual ? null : normalizeOptionalProvince(model.factProvincia),

    observaciones: normalizeOptionalText(model.observaciones),
    descuento: model.descuento,
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue: string = value.trim();

  return normalizedValue === '' ? null : normalizedValue;
}

function normalizeOptionalProvince(value: string): number | null {
  if (value === '') {
    return null;
  }

  const provincia: number = Number(value);

  if (!Number.isSafeInteger(provincia) || provincia <= 0) {
    throw new Error('La provincia indicada no es válida.');
  }

  return provincia;
}
