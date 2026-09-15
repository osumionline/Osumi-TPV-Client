import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import MarcaFormComponent from '@modules/compras/marcas/components/marca-form/marca-form.component';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MarcaFormComponent', (): void => {
  let fixture: ComponentFixture<MarcaFormComponent>;
  let component: MarcaFormComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [MarcaFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarcaFormComponent);

    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('considera obligatorio el nombre de la Marca', (): void => {
    expect(component.validate()).toBe(false);
    expect(component.marcaForm.nombre().touched()).toBe(true);
    expect(component.marcaForm.nombre().invalid()).toBe(true);
  });

  it('rechaza un nombre formado únicamente por espacios', (): void => {
    component.marcaForm.nombre().value.set('   ');

    expect(component.validate()).toBe(false);
    expect(component.marcaForm.nombre().invalid()).toBe(true);
  });

  it('permite dejar el email vacío', (): void => {
    component.marcaForm.nombre().value.set('Bosquimia');

    component.marcaForm.email().value.set('');

    expect(component.validate()).toBe(true);
  });

  it('rechaza un email con formato incorrecto', (): void => {
    component.marcaForm.nombre().value.set('Bosquimia');

    component.marcaForm.email().value.set('correo-no-valido');

    expect(component.validate()).toBe(false);
    expect(component.marcaForm.email().invalid()).toBe(true);
  });

  it('solicita guardar únicamente un formulario válido y dirty', (): void => {
    const saveSpy = vi.fn();

    component.saveEvent.subscribe(saveSpy);

    component.save(new Event('submit'));

    expect(saveSpy).not.toHaveBeenCalled();

    component.marcaForm.nombre().value.set('Bosquimia');

    fixture.componentRef.setInput('dirty', true);

    fixture.detectChanges();

    component.save(new Event('submit'));

    expect(saveSpy).toHaveBeenCalledOnce();

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Bosquimia',
      }),
    );
  });

  it('no permite guardar ni cancelar durante un guardado', (): void => {
    const saveSpy = vi.fn();
    const cancelSpy = vi.fn();

    component.saveEvent.subscribe(saveSpy);

    component.cancelEvent.subscribe(cancelSpy);

    component.marcaForm.nombre().value.set('Bosquimia');

    fixture.componentRef.setInput('dirty', true);

    fixture.componentRef.setInput('saving', true);

    fixture.detectChanges();

    component.save(new Event('submit'));

    component.cancel();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('sincroniza una nueva instantánea recibida', (): void => {
    const model: MarcaFormModel = {
      nombre: 'Bosquimia',
      telefono: '944000000',
      email: 'info@bosquimia.example.com',
      direccion: 'Calle Mayor 1',
      web: 'https://bosquimia.example.com',
      observaciones: 'Observaciones',
      foto: 'osumi://assets/files/brands/bosquimia.webp',
    };

    fixture.componentRef.setInput('initialValue', model);

    fixture.detectChanges();

    expect(component.marcaModel()).toEqual(model);
    expect(component.marcaModel()).not.toBe(model);
  });

  it('solo solicita Cancelar cuando existen cambios', (): void => {
    const cancelSpy = vi.fn();

    component.cancelEvent.subscribe(cancelSpy);

    component.cancel();

    expect(cancelSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('dirty', true);

    fixture.detectChanges();

    component.cancel();

    expect(cancelSpy).toHaveBeenCalledOnce();
  });

  it('enfoca el nombre cuando recibe una nueva solicitud', (): void => {
    const nameInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      'input[autocomplete="organization"]',
    );

    expect(nameInput).not.toBeNull();

    if (nameInput === null) {
      return;
    }

    const focusSpy = vi.spyOn(nameInput, 'focus');

    fixture.componentRef.setInput('focusNameRequest', 1);

    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalledOnce();
  });

  it('solicita quitar el logo cuando existe uno visible', (): void => {
    const removeSpy = vi.fn();

    component.logoRemoveEvent.subscribe(removeSpy);

    fixture.componentRef.setInput('initialValue', {
      nombre: 'Bosquimia',
      telefono: '',
      email: '',
      direccion: '',
      web: '',
      observaciones: '',
      foto: 'asset://files/brands/logo.webp',
    });

    fixture.detectChanges();

    component.removeLogo();

    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('comunica el archivo seleccionado como nuevo logo', (): void => {
    const selectedSpy = vi.fn();

    component.logoSelectedEvent.subscribe(selectedSpy);

    const file: File = new File(['logo'], 'logo.png', {
      type: 'image/png',
    });

    const inputElement: HTMLInputElement = document.createElement('input');

    Object.defineProperty(inputElement, 'files', {
      configurable: true,
      value: {
        item: (index: number): File | null => (index === 0 ? file : null),
      },
    });

    component.onLogoSelected({
      target: inputElement,
    } as unknown as Event);

    expect(selectedSpy).toHaveBeenCalledWith(file);
  });
});
