import { InstallationFormModel } from '@model/configuracion/installation-form.model';

export default function createInstallationFormInitialValue(): InstallationFormModel {
  return {
    negocio: {
      nombre: '',
      nombreComercial: '',
      cif: '',
      telefono: '',
      email: '',
      direccion: '',
      poblacion: '',
      logoDataUrl: '',
    },

    empleado: {
      nombre: '',
      password: '',
      confirmPassword: '',
      color: '#3f51b5',
    },

    redes: {
      twitter: '',
      facebook: '',
      instagram: '',
      web: '',
    },

    valoresIniciales: {
      cajaInicial: 0,
      ticketInicial: 1,
      facturaInicial: 1,
    },

    fiscalidad: {
      tipoIva: 'iva',

      ivaOptions: [
        {
          iva: 4,
          re: 0.5,
          selected: false,
        },
        {
          iva: 10,
          re: 1.4,
          selected: false,
        },
        {
          iva: 21,
          re: 5.2,
          selected: false,
        },
      ],

      marginOptions: [
        {
          value: 10,
          selected: false,
        },
        {
          value: 15,
          selected: false,
        },
        {
          value: 20,
          selected: false,
        },
        {
          value: 25,
          selected: false,
        },
        {
          value: 30,
          selected: false,
        },
        {
          value: 35,
          selected: false,
        },
        {
          value: 40,
          selected: false,
        },
        {
          value: 45,
          selected: false,
        },
        {
          value: 50,
          selected: false,
        },
        {
          value: 55,
          selected: false,
        },
        {
          value: 60,
          selected: false,
        },
        {
          value: 65,
          selected: false,
        },
        {
          value: 70,
          selected: false,
        },
        {
          value: 75,
          selected: false,
        },
        {
          value: 80,
          selected: false,
        },
        {
          value: 85,
          selected: false,
        },
        {
          value: 90,
          selected: false,
        },
        {
          value: 95,
          selected: false,
        },
      ],
    },

    ventaOnline: {
      active: false,
      urlApi: '',
      secretApi: '',
    },

    opciones: {
      backupApiKey: '',
      fechaCaducidad: false,
      empleados: false,
    },
  };
}
