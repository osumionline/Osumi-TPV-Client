export default interface ClienteFormModel {
  nombreApellidos: string;
  dniCif: string;
  telefono: string;
  email: string;

  direccion: string;
  codigoPostal: string;
  poblacion: string;
  provincia: string;

  descuento: number;
  observaciones: string;

  factIgual: boolean;
  factNombreApellidos: string;
  factDniCif: string;
  factTelefono: string;
  factEmail: string;
  factDireccion: string;
  factCodigoPostal: string;
  factPoblacion: string;
  factProvincia: string;
}
