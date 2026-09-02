import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type Cliente from '@model/clientes/cliente.model';

/**
 * Convierte un cliente persistido en el modelo editable de su ficha.
 */
export default function createClienteFormModel(cliente: Cliente): ClienteFormModel {
  return {
    nombreApellidos: cliente.nombreApellidos,
    dniCif: cliente.dniCif ?? '',
    telefono: cliente.telefono ?? '',
    email: cliente.email ?? '',

    direccion: cliente.direccion ?? '',
    codigoPostal: cliente.codigoPostal ?? '',
    poblacion: cliente.poblacion ?? '',
    provincia: optionalNumberToString(cliente.provincia),

    descuento: cliente.descuento,
    observaciones: cliente.observaciones ?? '',

    factIgual: cliente.factIgual,
    factNombreApellidos: cliente.factNombreApellidos ?? '',
    factDniCif: cliente.factDniCif ?? '',
    factTelefono: cliente.factTelefono ?? '',
    factEmail: cliente.factEmail ?? '',
    factDireccion: cliente.factDireccion ?? '',
    factCodigoPostal: cliente.factCodigoPostal ?? '',
    factPoblacion: cliente.factPoblacion ?? '',
    factProvincia: optionalNumberToString(cliente.factProvincia),
  };
}

/**
 * Convierte un identificador numérico opcional en el valor textual del formulario.
 */
function optionalNumberToString(value: number | null): string {
  return value === null ? '' : String(value);
}
