import { Injector, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, type FieldTree } from '@angular/forms/signals';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import clienteFormSchema from '@model/clientes/cliente-form.schema';

describe('clienteFormSchema', (): void => {
  it('solo valida los datos alternativos cuando se utilizan para facturar', (): void => {
    const model: WritableSignal<ClienteFormModel> = signal<ClienteFormModel>({
      ...createClienteFormInitialValue(),
      nombreApellidos: 'Ada Lovelace',
      factIgual: false,
      factEmail: 'email-no-valido',
    });

    const clienteForm: FieldTree<ClienteFormModel> = form(model, clienteFormSchema, {
      injector: TestBed.inject(Injector),
    });

    expect(clienteForm.factEmail().invalid()).toBe(true);

    clienteForm.factIgual().value.set(true);

    expect(clienteForm.factEmail().invalid()).toBe(false);
    expect(clienteForm.factEmail().value()).toBe('email-no-valido');

    clienteForm.factIgual().value.set(false);

    expect(clienteForm.factEmail().invalid()).toBe(true);
  });
});
