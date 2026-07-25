import type {
  InstallationCommand,
  InstallationLogoData,
} from '@desktop-contracts/configuration/installation-command.interface';
import type {
  InstallationFormModel,
  IvaOptionFormModel,
  MarginOptionFormModel,
} from '@model/configuracion/installation-form.model';

export default function createInstallationCommand(
  model: InstallationFormModel,
  logoFileName: string,
  logoMimeType: string,
): InstallationCommand {
  const selectedIvaOptions: IvaOptionFormModel[] = model.fiscalidad.ivaOptions.filter(
    (option: IvaOptionFormModel): boolean => option.selected,
  );

  const ivaList: number[] = selectedIvaOptions.map(
    (option: IvaOptionFormModel): number => option.iva,
  );

  const reList: number[] =
    model.fiscalidad.tipoIva === 're'
      ? selectedIvaOptions.map((option: IvaOptionFormModel): number => option.re)
      : [];

  const marginList: number[] = model.fiscalidad.marginOptions
    .filter((option: MarginOptionFormModel): boolean => option.selected)
    .map((option: MarginOptionFormModel): number => option.value);

  const logo: InstallationLogoData = {
    fileName: logoFileName,
    mimeType: logoMimeType,
    dataUrl: model.negocio.logoDataUrl,
  };

  return {
    negocio: {
      nombre: model.negocio.nombre.trim(),
      nombreComercial: model.negocio.nombreComercial.trim(),
      cif: model.negocio.cif.trim(),
      telefono: model.negocio.telefono.trim(),
      email: model.negocio.email.trim(),
      direccion: model.negocio.direccion.trim(),
      poblacion: model.negocio.poblacion.trim(),
    },

    empleadoInicial: {
      nombre: model.empleado.nombre.trim(),
      password: model.empleado.password,
      color: model.empleado.color,
    },

    redes: {
      twitter: model.redes.twitter.trim(),
      facebook: model.redes.facebook.trim(),
      instagram: model.redes.instagram.trim(),
      web: model.redes.web.trim(),
    },

    valoresIniciales: {
      cajaInicial: model.valoresIniciales.cajaInicial,
      ticketInicial: model.valoresIniciales.ticketInicial,
      facturaInicial: model.valoresIniciales.facturaInicial,
    },

    fiscalidad: {
      tipoIva: model.fiscalidad.tipoIva,
      ivaList,
      reList,
      marginList,
    },

    ventaOnline: {
      active: model.ventaOnline.active,
      urlApi: model.ventaOnline.active ? model.ventaOnline.urlApi.trim() : '',
    },

    opciones: {
      fechaCaducidad: model.opciones.fechaCaducidad,
      empleados: model.opciones.empleados,
    },

    secretos: {
      secretApi: model.ventaOnline.active ? model.ventaOnline.secretApi : '',
      backupApiKey: model.opciones.backupApiKey,
    },

    logo,
  };
}
