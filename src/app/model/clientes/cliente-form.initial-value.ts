import type ClienteFormModel from '@model/clientes/cliente-form.model';

export default function createClienteFormInitialValue(): ClienteFormModel {
  return {
    nombreApellidos: '',
    dniCif: '',
    telefono: '',
    email: '',

    direccion: '',
    codigoPostal: '',
    poblacion: '',
    provincia: '',

    descuento: 0,
    observaciones: '',

    factIgual: true,
    factNombreApellidos: '',
    factDniCif: '',
    factTelefono: '',
    factEmail: '',
    factDireccion: '',
    factCodigoPostal: '',
    factPoblacion: '',
    factProvincia: '',
  };
}
