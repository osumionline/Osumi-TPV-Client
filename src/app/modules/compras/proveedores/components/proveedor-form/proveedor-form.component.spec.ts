import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import ProveedorFormComponent from '@modules/compras/proveedores/components/proveedor-form/proveedor-form.component';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ProveedorFormComponent', (): void => {
  let fixture: ComponentFixture<ProveedorFormComponent>;
  let component: ProveedorFormComponent;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ProveedorFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedorFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('considera obligatorio el nombre', (): void => {
    expect(component.validate()).toBe(false);
    expect(component.proveedorForm.nombre().invalid()).toBe(true);
  });

  it('rechaza un nombre formado únicamente por espacios', (): void => {
    component.proveedorForm.nombre().value.set('   ');

    expect(component.validate()).toBe(false);
  });

  it('permite dejar el email vacío', (): void => {
    component.proveedorForm.nombre().value.set('Proveedor');
    component.proveedorForm.email().value.set('');

    expect(component.validate()).toBe(true);
  });

  it('rechaza un email incorrecto', (): void => {
    component.proveedorForm.nombre().value.set('Proveedor');
    component.proveedorForm.email().value.set('correo-no-valido');

    expect(component.validate()).toBe(false);
  });

  it('guarda únicamente cuando está dirty y es válido', (): void => {
    const saveSpy = vi.fn();

    component.saveEvent.subscribe(saveSpy);
    component.proveedorForm.nombre().value.set('Proveedor');

    fixture.componentRef.setInput('dirty', true);
    fixture.detectChanges();

    component.save(new Event('submit'));

    expect(saveSpy).toHaveBeenCalledOnce();
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Proveedor',
        marcas: [],
      }),
    );
  });

  it('sincroniza una instantánea recibida conservando Marcas', (): void => {
    const model: ProveedorFormModel = {
      nombre: 'Proveedor',
      telefono: '944000000',
      email: 'info@example.com',
      direccion: 'Calle Mayor 1',
      web: 'https://example.com',
      observaciones: 'Observaciones',
      foto: 'asset://files/providers/logo.webp',
      marcas: [1, 3],
    };

    fixture.componentRef.setInput('initialValue', model);
    fixture.detectChanges();

    expect(component.proveedorModel()).toEqual(model);
    expect(component.proveedorModel()).not.toBe(model);
    expect(component.proveedorModel().marcas).not.toBe(model.marcas);
  });

  it('solicita quitar el logo cuando existe', (): void => {
    const removeSpy = vi.fn();

    component.logoRemoveEvent.subscribe(removeSpy);

    fixture.componentRef.setInput('initialValue', {
      nombre: 'Proveedor',
      telefono: '',
      email: '',
      direccion: '',
      web: '',
      observaciones: '',
      foto: 'asset://files/providers/logo.webp',
      marcas: [],
    });
    fixture.detectChanges();

    component.removeLogo();

    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('solo solicita eliminar un proveedor persistido', (): void => {
    const deleteSpy = vi.fn();

    component.deleteEvent.subscribe(deleteSpy);
    component.deleteProveedor();

    expect(deleteSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('canDelete', true);
    fixture.detectChanges();
    component.deleteProveedor();

    expect(deleteSpy).toHaveBeenCalledOnce();
  });
});
