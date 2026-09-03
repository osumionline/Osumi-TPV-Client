import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import createClienteCommand from '@model/clientes/cliente-form-command.mapper';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';

describe('createClienteCommand', (): void => {
  it('conserva los datos alternativos cuando la facturación usa los datos generales', (): void => {
    const model: ClienteFormModel = {
      ...createClienteFormInitialValue(),
      nombreApellidos: 'Ada Lovelace',
      factIgual: true,
      factNombreApellidos: '  Analytical Engines SL  ',
      factDniCif: '  B12345678  ',
      factTelefono: '  944000000  ',
      factEmail: '  billing@example.com  ',
      factDireccion: '  Calle Mayor 1  ',
      factCodigoPostal: '  48001  ',
      factPoblacion: '  Bilbao  ',
      factProvincia: '48',
    };

    const command: CrearClienteCommand = createClienteCommand(model);

    expect(command).toMatchObject({
      factIgual: true,
      factNombreApellidos: 'Analytical Engines SL',
      factDniCif: 'B12345678',
      factTelefono: '944000000',
      factEmail: 'billing@example.com',
      factDireccion: 'Calle Mayor 1',
      factCodigoPostal: '48001',
      factPoblacion: 'Bilbao',
      factProvincia: 48,
    });
  });
});
