import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import Marca from '@model/marcas/marca.model';
import ProveedorMarcasComponent from '@modules/compras/proveedores/components/proveedor-marcas/proveedor-marcas.component';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('ProveedorMarcasComponent', (): void => {
  let fixture: ComponentFixture<ProveedorMarcasComponent>;
  let component: ProveedorMarcasComponent;

  const marca1: Marca = createMarca(1, 'Marca uno');
  const marca2: Marca = createMarca(2, 'Marca dos');

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ProveedorMarcasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedorMarcasComponent);
    fixture.componentRef.setInput('marcas', [marca1, marca2]);
    fixture.componentRef.setInput('selectedIds', [1]);

    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('identifica las Marcas seleccionadas', (): void => {
    expect(component.isSelected(marca1)).toBe(true);
    expect(component.isSelected(marca2)).toBe(false);
  });

  it('añade una Marca a la selección', (): void => {
    const changeSpy = vi.fn();

    component.selectionChangeEvent.subscribe(changeSpy);
    component.toggleMarca(marca2, true);

    expect(changeSpy).toHaveBeenCalledWith([1, 2]);
  });

  it('elimina una Marca de la selección', (): void => {
    const changeSpy = vi.fn();

    component.selectionChangeEvent.subscribe(changeSpy);
    component.toggleMarca(marca1, false);

    expect(changeSpy).toHaveBeenCalledWith([]);
  });

  it('sólo permite Guardar y Cancelar cuando existe dirty', (): void => {
    const saveSpy = vi.fn();
    const cancelSpy = vi.fn();

    component.saveEvent.subscribe(saveSpy);
    component.cancelEvent.subscribe(cancelSpy);
    component.save();
    component.cancel();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();

    fixture.componentRef.setInput('dirty', true);
    fixture.detectChanges();

    component.save();
    component.cancel();

    expect(saveSpy).toHaveBeenCalledOnce();

    expect(cancelSpy).toHaveBeenCalledOnce();
  });
});

function createMarca(id: number, nombre: string): Marca {
  const marca: Marca = new Marca();

  marca.id = id;
  marca.publicId = `marca-${id}`;
  marca.nombre = nombre;

  return marca;
}
