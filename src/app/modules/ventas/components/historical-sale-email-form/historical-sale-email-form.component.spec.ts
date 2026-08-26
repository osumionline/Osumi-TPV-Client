import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import HistoricalSaleEmailFormComponent from '@modules/ventas/components/historical-sale-email-form/historical-sale-email-form.component';

describe('HistoricalSaleEmailFormComponent', (): void => {
  let fixture: ComponentFixture<HistoricalSaleEmailFormComponent>;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [HistoricalSaleEmailFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoricalSaleEmailFormComponent);
  });

  it('prerrellena el destinatario con el email recibido', (): void => {
    fixture.componentRef.setInput('destinatarioInicial', 'cliente@example.com');

    fixture.detectChanges();

    const input: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[type="email"]');

    expect(input).not.toBeNull();

    expect(input?.value).toBe('cliente@example.com');

    expect(fixture.componentInstance.destinatarioValido()).toBe(true);
  });

  it('permite modificar el email inicial sin alterar su origen', (): void => {
    fixture.componentRef.setInput('destinatarioInicial', 'cliente@example.com');

    fixture.detectChanges();

    const input: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[type="email"]');

    expect(input).not.toBeNull();

    if (input === null) {
      throw new Error('No se ha encontrado el campo de destinatario.');
    }

    input.value = 'otro@example.com';

    input.dispatchEvent(new Event('input'));

    fixture.detectChanges();

    expect(fixture.componentInstance.destinatario()).toBe('otro@example.com');

    expect(fixture.componentInstance.destinatarioInicial()).toBe('cliente@example.com');
  });

  it('mantiene vacío el destinatario cuando no recibe email inicial', (): void => {
    fixture.detectChanges();

    expect(fixture.componentInstance.destinatario()).toBe('');

    expect(fixture.componentInstance.destinatarioValido()).toBe(false);
  });
});
