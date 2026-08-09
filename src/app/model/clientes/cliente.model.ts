import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';

export default class Cliente {
  id: number | null = null;
  publicId: string | null = null;
  nombreApellidos: string = '';
  dniCif: string | null = null;
  telefono: string | null = null;
  email: string | null = null;
  direccion: string | null = null;
  codigoPostal: string | null = null;
  poblacion: string | null = null;
  provincia: number | null = null;
  factIgual: boolean = true;
  factNombreApellidos: string | null = null;
  factDniCif: string | null = null;
  factTelefono: string | null = null;
  factEmail: string | null = null;
  factDireccion: string | null = null;
  factCodigoPostal: string | null = null;
  factPoblacion: string | null = null;
  factProvincia: number | null = null;
  observaciones: string | null = null;
  descuento: number = 0;
  ultimaVenta: string | null = null;

  fromInterface(cliente: ClienteInterface): Cliente {
    this.id = cliente.id;
    this.publicId = cliente.publicId;
    this.nombreApellidos = cliente.nombreApellidos;
    this.dniCif = cliente.dniCif;
    this.telefono = cliente.telefono;
    this.email = cliente.email;
    this.direccion = cliente.direccion;
    this.codigoPostal = cliente.codigoPostal;
    this.poblacion = cliente.poblacion;
    this.provincia = cliente.provincia;
    this.factIgual = cliente.factIgual;
    this.factNombreApellidos = cliente.factNombreApellidos;
    this.factDniCif = cliente.factDniCif;
    this.factTelefono = cliente.factTelefono;
    this.factEmail = cliente.factEmail;
    this.factDireccion = cliente.factDireccion;
    this.factCodigoPostal = cliente.factCodigoPostal;
    this.factPoblacion = cliente.factPoblacion;
    this.factProvincia = cliente.factProvincia;
    this.observaciones = cliente.observaciones;
    this.descuento = cliente.descuento;
    this.ultimaVenta = cliente.ultimaVenta;

    return this;
  }

  toInterface(): ClienteInterface {
    if (this.id === null || this.publicId === null) {
      throw new Error('No se puede convertir un cliente no persistido a ClienteInterface.');
    }

    return {
      id: this.id,
      publicId: this.publicId,
      nombreApellidos: this.nombreApellidos,
      dniCif: this.dniCif,
      telefono: this.telefono,
      email: this.email,
      direccion: this.direccion,
      codigoPostal: this.codigoPostal,
      poblacion: this.poblacion,
      provincia: this.provincia,
      factIgual: this.factIgual,
      factNombreApellidos: this.factNombreApellidos,
      factDniCif: this.factDniCif,
      factTelefono: this.factTelefono,
      factEmail: this.factEmail,
      factDireccion: this.factDireccion,
      factCodigoPostal: this.factCodigoPostal,
      factPoblacion: this.factPoblacion,
      factProvincia: this.factProvincia,
      observaciones: this.observaciones,
      descuento: this.descuento,
      ultimaVenta: this.ultimaVenta,
    };
  }
}
