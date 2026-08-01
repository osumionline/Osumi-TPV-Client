import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';

export default function createAppData(command: InstallationCommand, installedAt: string): AppData {
  return {
    schemaVersion: 1,
    installedAt,

    nombre: command.negocio.nombre,
    nombreComercial: command.negocio.nombreComercial,
    cif: command.negocio.cif,
    telefono: command.negocio.telefono,
    direccion: command.negocio.direccion,
    poblacion: command.negocio.poblacion,
    email: command.negocio.email,

    twitter: command.redes.twitter,
    facebook: command.redes.facebook,
    instagram: command.redes.instagram,
    web: command.redes.web,

    tipoIva: command.fiscalidad.tipoIva,
    ivaList: [...command.fiscalidad.ivaList],
    reList: [...command.fiscalidad.reList],
    marginList: [...command.fiscalidad.marginList],

    ventaOnline: command.ventaOnline.active,
    urlApi: command.ventaOnline.urlApi,

    fechaCad: command.opciones.fechaCaducidad,
    empleados: command.opciones.empleados,
  };
}
