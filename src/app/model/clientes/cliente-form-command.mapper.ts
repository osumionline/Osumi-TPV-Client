import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import { trimToNull } from '@utils/string.utils';

export default function createClienteCommand(model: ClienteFormModel): CrearClienteCommand {
  return {
    nombreApellidos: model.nombreApellidos.trim(),
    dniCif: trimToNull(model.dniCif),
    telefono: trimToNull(model.telefono),
    email: trimToNull(model.email),
    direccion: trimToNull(model.direccion),
    codigoPostal: trimToNull(model.codigoPostal),
    poblacion: trimToNull(model.poblacion),
    provincia: normalizeOptionalProvince(model.provincia),
    factIgual: model.factIgual,
    factNombreApellidos: trimToNull(model.factNombreApellidos),
    factDniCif: trimToNull(model.factDniCif),
    factTelefono: trimToNull(model.factTelefono),
    factEmail: trimToNull(model.factEmail),
    factDireccion: trimToNull(model.factDireccion),
    factCodigoPostal: trimToNull(model.factCodigoPostal),
    factPoblacion: trimToNull(model.factPoblacion),
    factProvincia: normalizeOptionalProvince(model.factProvincia),
    observaciones: trimToNull(model.observaciones),
    descuento: model.descuento,
  };
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
