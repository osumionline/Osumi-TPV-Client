import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import {
  areClienteFormModelsEqual,
  cloneClienteFormModel,
} from '@model/clientes/cliente-form.utils';

describe('ClienteFormUtils', (): void => {
  it('crea una copia independiente con los mismos valores', (): void => {
    const original: ClienteFormModel = createClienteFormInitialValue();

    original.nombreApellidos = 'Ada Lovelace';
    original.factIgual = false;
    original.factProvincia = '48';

    const clone: ClienteFormModel = cloneClienteFormModel(original);

    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(areClienteFormModelsEqual(original, clone)).toBe(true);
  });

  it('detecta cualquier campo modificado', (): void => {
    const original: ClienteFormModel = createClienteFormInitialValue();
    const modified: ClienteFormModel = cloneClienteFormModel(original);

    modified.factEmail = 'facturacion@example.com';

    expect(areClienteFormModelsEqual(original, modified)).toBe(false);
  });
});
