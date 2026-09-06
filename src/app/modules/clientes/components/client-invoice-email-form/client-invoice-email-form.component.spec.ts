import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import ClientInvoiceEmailFormComponent from '@modules/clientes/components/client-invoice-email-form/client-invoice-email-form.component';

describe('ClientInvoiceEmailFormComponent', (): void => {
  let fixture: ComponentFixture<ClientInvoiceEmailFormComponent>;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ClientInvoiceEmailFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientInvoiceEmailFormComponent);
    fixture.componentRef.setInput('destinatarioInicial', 'cliente@example.com');
    fixture.detectChanges();
  });

  it('inicializa el formulario con el email recibido sin modificarlo externamente', (): void => {
    expect(fixture.componentInstance.destinatario()).toBe('cliente@example.com');
    expect(fixture.componentInstance.destinatarioValido()).toBe(true);
  });

  it('permite modificar el destinatario exclusivamente para el envío', (): void => {
    const input: HTMLInputElement | null = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>('input[type="email"]');

    if (input === null) {
      throw new Error('No se ha encontrado el campo de destinatario.');
    }

    input.value = 'otro@example.com';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.destinatario()).toBe('otro@example.com');
    expect(fixture.componentInstance.destinatarioInicial()).toBe('cliente@example.com');
  });

  it('emite únicamente destinatarios válidos y normalizados', (): void => {
    const received: string[] = [];

    fixture.componentInstance.sendEvent.subscribe((destinatario: string): void => {
      received.push(destinatario);
    });

    fixture.componentInstance.destinatario.set('  otro@example.com  ');

    fixture.componentInstance.submit(new Event('submit'));

    expect(received).toEqual(['otro@example.com']);

    fixture.componentInstance.destinatario.set('email-invalido');

    fixture.componentInstance.submit(new Event('submit'));

    expect(received).toEqual(['otro@example.com']);
  });
});
