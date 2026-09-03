import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import ClientFormComponent from '@modules/clientes/components/client-form/client-form.component';

describe('ClientFormComponent', (): void => {
  let fixture: ComponentFixture<ClientFormComponent>;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ClientFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientFormComponent);
    fixture.detectChanges();
  });

  it('identifica Datos como la sección inválida prioritaria', (): void => {
    const component: ClientFormComponent = fixture.componentInstance;

    expect(component.validate()).toBe('data');
    expect(component.clienteForm.nombreApellidos().touched()).toBe(true);
  });

  it('identifica Facturación cuando contiene el único error', (): void => {
    const component: ClientFormComponent = fixture.componentInstance;

    component.clienteForm.nombreApellidos().value.set('Ada Lovelace');
    component.clienteForm.factIgual().value.set(false);
    component.clienteForm.factEmail().value.set('email-no-valido');

    expect(component.validate()).toBe('billing');
    expect(component.clienteForm.factEmail().touched()).toBe(true);
  });
});
