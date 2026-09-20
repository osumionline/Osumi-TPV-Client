import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';
import ManagementPaymentTypesComponent from '@modules/gestion/pages/management-payment-types/management-payment-types.component';
import { DialogService } from '@osumi/angular-tools';
import FilesService from '@services/application/files.service';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { of } from 'rxjs';
import { vi } from 'vitest';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('ManagementPaymentTypesComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let tiposPagoService: TiposPagoService;
  let dialog: DialogService;
  let stagePaymentTypeImageMock: ReturnType<typeof vi.fn>;
  let discardStagedImageMock: ReturnType<typeof vi.fn>;

  beforeEach(async (): Promise<void> => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');
    stagePaymentTypeImageMock = vi.fn();
    discardStagedImageMock = vi.fn().mockResolvedValue(undefined);

    const tiposPago: readonly TipoPagoInterface[] = [
      {
        id: 1,
        publicId: 'tipo-pago-efectivo',
        nombre: 'Efectivo',
        slug: 'efectivo',
        foto: null,
        afectaCaja: true,
        orden: 0,
        fisico: true,
      },
      {
        id: 2,
        publicId: 'tipo-pago-visa',
        nombre: 'VISA',
        slug: 'visa',
        foto: 'osumi://assets/files/payment-types/visa.webp',
        afectaCaja: false,
        orden: 1,
        fisico: true,
      },
      {
        id: 3,
        publicId: 'tipo-pago-bizum',
        nombre: 'Bizum',
        slug: 'bizum',
        foto: 'osumi://assets/files/payment-types/bizum.webp',
        afectaCaja: false,
        orden: 2,
        fisico: true,
      },
    ];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        tiposPago: {
          getAll: (): Promise<readonly TipoPagoInterface[]> => Promise.resolve(tiposPago),
          deactivate: (): Promise<void> => Promise.resolve(),
        },
      },
    });

    await TestBed.configureTestingModule({
      imports: [ManagementPaymentTypesComponent],
      providers: [
        provideRouter([]),
        TiposPagoService,
        {
          provide: FilesService,
          useValue: {
            stagePaymentTypeImage: stagePaymentTypeImageMock,
            discardStagedImage: discardStagedImageMock,
          },
        },
      ],
    }).compileComponents();

    tiposPagoService = TestBed.inject(TiposPagoService);
    dialog = TestBed.inject(DialogService);

    await tiposPagoService.load();
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);
    } else {
      Reflect.deleteProperty(window, 'osumiDesktop');
    }

    vi.restoreAllMocks();
  });

  it('muestra solo los tipos de pago configurables y oculta Efectivo', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    expect(
      component.tiposPagoConfigurables().map((tipoPago: TipoPago): string => tipoPago.slug),
    ).toEqual(['visa', 'bizum']);
  });

  it('filtra los tipos de pago por nombre', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.updateSearchTerm('biz');

    expect(
      component.filteredTiposPago().map((tipoPago: TipoPago): string => tipoPago.nombre),
    ).toEqual(['Bizum']);
  });

  it('solo permite reordenar cuando no hay búsqueda activa', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    expect(component.canReorderTiposPago()).toBe(true);

    component.updateSearchTerm('visa');

    expect(component.canReorderTiposPago()).toBe(false);

    component.updateSearchTerm('');

    expect(component.canReorderTiposPago()).toBe(true);
  });

  it('persiste el nuevo orden al completar un drag', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const reorderSpy = vi.spyOn(tiposPagoService, 'reorder').mockResolvedValueOnce();

    await component.reorderTiposPago(createDropEvent(0, 1));

    expect(reorderSpy).toHaveBeenCalledWith({
      ids: [3, 2],
    });
  });

  it('persiste el nuevo orden al completar un drag', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const reorderSpy = vi.spyOn(tiposPagoService, 'reorder').mockResolvedValueOnce();

    await component.reorderTiposPago(createDropEvent(0, 1));

    expect(reorderSpy).toHaveBeenCalledWith({
      ids: [3, 2],
    });
  });

  it('ignora un drop mientras existe una búsqueda activa', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const reorderSpy = vi.spyOn(tiposPagoService, 'reorder');

    component.updateSearchTerm('visa');

    await component.reorderTiposPago(createDropEvent(0, 1));

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it('muestra un error si no puede persistir el nuevo orden', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    vi.spyOn(tiposPagoService, 'reorder').mockRejectedValueOnce(new Error('Database error'));

    const alertSpy = vi.spyOn(dialog, 'alert');

    await component.reorderTiposPago(createDropEvent(0, 1));

    expect(alertSpy).toHaveBeenCalledWith({
      title: 'Error',
      content: 'Database error',
    });
  });

  it('selecciona un tipo de pago existente', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    component.selectTipoPago(tipoPago);

    expect(component.selectedTipoPago()).toBe(tipoPago);

    expect(component.creatingTipoPago()).toBe(false);
  });

  it('entra en modo alta sin mantener un tipo seleccionado', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    component.selectTipoPago(tipoPago);

    component.startCreatingTipoPago();

    expect(component.selectedTipoPago()).toBeNull();

    expect(component.creatingTipoPago()).toBe(true);
  });

  it('vuelve a Datos al seleccionar otro tipo de pago desde Estadísticas', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tiposPago: readonly TipoPago[] = component.tiposPagoConfigurables();

    component.selectTipoPago(tiposPago[0]);

    component.handleTabIndexChange(1);

    expect(component.selectedTabIndex()).toBe(1);

    component.selectTipoPago(tiposPago[1]);

    expect(component.selectedTipoPago()).toBe(tiposPago[1]);

    expect(component.selectedTabIndex()).toBe(0);
  });

  it('vuelve a Datos al iniciar un alta desde Estadísticas', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.selectTipoPago(component.tiposPagoConfigurables()[0]);

    component.handleTabIndexChange(1);

    expect(component.selectedTabIndex()).toBe(1);

    component.startCreatingTipoPago();

    expect(component.creatingTipoPago()).toBe(true);

    expect(component.selectedTipoPago()).toBeNull();

    expect(component.selectedTabIndex()).toBe(0);
  });

  it('carga los datos del tipo seleccionado en el formulario', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    component.selectTipoPago(tipoPago);

    expect(component.tipoPagoDataModel()).toEqual({
      mode: 'edit',
      nombre: 'VISA',
      afectaCaja: false,
      fisico: true,
      foto: 'osumi://assets/files/payment-types/visa.webp',
    });

    expect(component.tipoPagoDataForm().dirty()).toBe(false);
  });

  it('inicia el formulario de alta con los valores por defecto', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.startCreatingTipoPago();

    expect(component.tipoPagoDataModel()).toEqual({
      mode: 'create',
      nombre: '',
      afectaCaja: false,
      fisico: true,
      foto: null,
    });
  });

  it('pone el foco en Nombre al seleccionar un tipo de pago', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    fixture.detectChanges();

    component.selectTipoPago(component.tiposPagoConfigurables()[0]);

    fixture.detectChanges();

    await fixture.whenStable();

    const nombreInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.payment-type-data-form input[type="text"]',
    );

    expect(nombreInput).not.toBeNull();

    expect(document.activeElement).toBe(nombreInput);
  });

  it('vuelve a Datos y enfoca Nombre al seleccionar otro tipo desde Estadísticas', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tiposPago: readonly TipoPago[] = component.tiposPagoConfigurables();

    component.selectTipoPago(tiposPago[0]);

    fixture.detectChanges();
    await fixture.whenStable();

    component.handleTabIndexChange(1);

    fixture.detectChanges();

    expect(component.selectedTabIndex()).toBe(1);

    component.selectTipoPago(tiposPago[1]);

    fixture.detectChanges();

    expect(component.selectedTabIndex()).toBe(0);

    /*
     * En la aplicación real Angular Material
     * emite animationDone al terminar
     * la transición a Datos.
     */
    component.handleTabAnimationDone();

    await fixture.whenStable();

    const nombreInput: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.payment-type-data-form input[type="text"]',
    );

    expect(nombreInput).not.toBeNull();

    expect(document.activeElement).toBe(nombreInput);
  });

  it('considera obligatorio el logo en un alta', (): void => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.startCreatingTipoPago();

    component.tipoPagoDataForm.nombre().value.set('Tarjeta regalo');

    expect(component.tipoPagoDataForm().invalid()).toBe(true);

    component.tipoPagoDataForm.foto().value.set('osumi://assets/staging/tarjeta-regalo.webp');

    expect(component.tipoPagoDataForm().invalid()).toBe(false);
  });

  it('muestra como preview el logo procesado por el staging', async (): Promise<void> => {
    const stagedImage: StagedImageInterface = createStagedPaymentTypeImage(
      'staging-logo-1',
      'osumi://assets/staging/logo-1.webp',
    );

    stagePaymentTypeImageMock.mockResolvedValueOnce(stagedImage);

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.startCreatingTipoPago();

    const file: File = new File(['logo'], 'logo.png', {
      type: 'image/png',
    });

    await component.onLogoSelected(createFileInputEvent(file));

    expect(stagePaymentTypeImageMock).toHaveBeenCalledWith(file);

    expect(component.tipoPagoDataModel().foto).toBe(stagedImage.url);

    expect(component.logoError()).toBeNull();
  });

  it('descarta el staging anterior al seleccionar otro logo', async (): Promise<void> => {
    stagePaymentTypeImageMock
      .mockResolvedValueOnce(
        createStagedPaymentTypeImage('staging-logo-1', 'osumi://assets/staging/logo-1.webp'),
      )
      .mockResolvedValueOnce(
        createStagedPaymentTypeImage('staging-logo-2', 'osumi://assets/staging/logo-2.webp'),
      );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.startCreatingTipoPago();

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['logo-1'], 'logo-1.png', {
          type: 'image/png',
        }),
      ),
    );

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['logo-2'], 'logo-2.png', {
          type: 'image/png',
        }),
      ),
    );

    expect(discardStagedImageMock).toHaveBeenCalledWith('staging-logo-1');

    expect(component.tipoPagoDataModel().foto).toBe('osumi://assets/staging/logo-2.webp');
  });

  it('descarta el logo temporal al cancelar y restaura el persistido', async (): Promise<void> => {
    stagePaymentTypeImageMock.mockResolvedValueOnce(
      createStagedPaymentTypeImage('staging-logo-1', 'osumi://assets/staging/logo-1.webp'),
    );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.selectTipoPago(component.tiposPagoConfigurables()[0]);

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['logo'], 'logo.png', {
          type: 'image/png',
        }),
      ),
    );

    await component.cancelTipoPagoChanges();

    expect(discardStagedImageMock).toHaveBeenCalledWith('staging-logo-1');

    expect(component.tipoPagoDataModel().foto).toBe('osumi://assets/files/payment-types/visa.webp');
  });

  it('conserva el logo anterior si la nueva imagen no puede procesarse', async (): Promise<void> => {
    stagePaymentTypeImageMock.mockRejectedValueOnce(
      new Error('La imagen seleccionada no es válida.'),
    );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    component.selectTipoPago(component.tiposPagoConfigurables()[0]);

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['contenido'], 'logo.txt', {
          type: 'text/plain',
        }),
      ),
    );

    expect(component.tipoPagoDataModel().foto).toBe('osumi://assets/files/payment-types/visa.webp');

    expect(component.logoError()).toBe('La imagen seleccionada no es válida.');
  });

  it('crea un tipo de pago y adopta la versión persistida', async (): Promise<void> => {
    stagePaymentTypeImageMock.mockResolvedValueOnce(
      createStagedPaymentTypeImage('staging-mastercard', 'osumi://assets/staging/mastercard.webp'),
    );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const createdTipoPago: TipoPago = new TipoPago().fromInterface({
      id: 4,
      publicId: 'tipo-pago-mastercard',
      nombre: 'Mastercard',
      slug: 'mastercard',
      foto: 'osumi://assets/files/payment-types/mastercard.webp',
      afectaCaja: false,
      orden: 3,
      fisico: true,
    });

    const createSpy = vi.spyOn(tiposPagoService, 'create').mockResolvedValue(createdTipoPago);

    await component.startCreatingTipoPago();

    component.tipoPagoDataForm.nombre().value.set('  Mastercard  ');

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['logo'], 'mastercard.png', {
          type: 'image/png',
        }),
      ),
    );

    await component.saveTipoPago();

    expect(createSpy).toHaveBeenCalledWith({
      nombre: 'Mastercard',
      afectaCaja: false,
      fisico: true,
      logoStagingId: 'staging-mastercard',
    } satisfies CrearTipoPagoCommand);

    expect(component.creatingTipoPago()).toBe(false);

    expect(component.selectedTipoPago()).toBe(createdTipoPago);

    expect(component.tipoPagoDataModel()).toEqual({
      mode: 'edit',
      nombre: 'Mastercard',
      afectaCaja: false,
      fisico: true,
      foto: 'osumi://assets/files/payment-types/mastercard.webp',
    });

    expect(component.tipoPagoDataForm().dirty()).toBe(false);

    /*
     * El staging ha pasado a ser responsabilidad
     * del backend y el componente no debe
     * intentar descartarlo de nuevo.
     */
    fixture.destroy();

    expect(discardStagedImageMock).not.toHaveBeenCalled();
  });

  it('actualiza un tipo de pago conservando el logo cuando no hay staging nuevo', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    const updatedTipoPago: TipoPago = new TipoPago().fromInterface({
      id: 2,
      publicId: 'tipo-pago-visa',
      nombre: 'Tarjeta',
      slug: 'tarjeta',
      foto: 'osumi://assets/files/payment-types/visa.webp',
      afectaCaja: true,
      orden: 1,
      fisico: false,
    });

    const updateSpy = vi.spyOn(tiposPagoService, 'update').mockResolvedValue(updatedTipoPago);

    await component.selectTipoPago(tipoPago);

    component.tipoPagoDataForm.nombre().value.set(' Tarjeta ');

    component.tipoPagoDataForm.afectaCaja().value.set(true);

    component.tipoPagoDataForm.fisico().value.set(false);

    await component.saveTipoPago();

    expect(updateSpy).toHaveBeenCalledWith(2, {
      nombre: 'Tarjeta',
      afectaCaja: true,
      fisico: false,
      logoStagingId: null,
    } satisfies ActualizarTipoPagoCommand);

    expect(component.selectedTipoPago()).toBe(updatedTipoPago);

    expect(component.tipoPagoDataForm().dirty()).toBe(false);
  });

  it('envía el staging al sustituir el logo de un tipo de pago', async (): Promise<void> => {
    stagePaymentTypeImageMock.mockResolvedValueOnce(
      createStagedPaymentTypeImage('staging-visa-new', 'osumi://assets/staging/visa-new.webp'),
    );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    const updatedTipoPago: TipoPago = new TipoPago().fromInterface({
      ...tipoPago.toInterface(),
      foto: 'osumi://assets/files/payment-types/visa-new.webp',
    });

    const updateSpy = vi.spyOn(tiposPagoService, 'update').mockResolvedValue(updatedTipoPago);

    await component.selectTipoPago(tipoPago);

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['nuevo-logo'], 'visa-new.png', {
          type: 'image/png',
        }),
      ),
    );

    await component.saveTipoPago();

    expect(updateSpy).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        logoStagingId: 'staging-visa-new',
      }),
    );

    fixture.destroy();

    /*
     * Tampoco se descarta aquí:
     * Electron ya lo consumió al guardar.
     */
    expect(discardStagedImageMock).not.toHaveBeenCalled();
  });

  it('muestra temporalmente la confirmación después de guardar', async (): Promise<void> => {
    vi.useFakeTimers();

    try {
      const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
        ManagementPaymentTypesComponent,
      );

      const component: ManagementPaymentTypesComponent = fixture.componentInstance;

      const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

      const updatedTipoPago: TipoPago = new TipoPago().fromInterface({
        ...tipoPago.toInterface(),
        nombre: 'VISA actualizada',
      });

      vi.spyOn(tiposPagoService, 'update').mockResolvedValue(updatedTipoPago);

      await component.selectTipoPago(tipoPago);

      component.tipoPagoDataForm.nombre().value.set('VISA actualizada');

      await component.saveTipoPago();

      expect(component.saveSuccessful()).toBe(true);

      vi.advanceTimersByTime(3_999);

      expect(component.saveSuccessful()).toBe(true);

      vi.advanceTimersByTime(1);

      expect(component.saveSuccessful()).toBe(false);

      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('elimina un tipo de pago confirmado y limpia su staging pendiente', async (): Promise<void> => {
    stagePaymentTypeImageMock.mockResolvedValueOnce(
      createStagedPaymentTypeImage(
        'staging-visa-delete',
        'osumi://assets/staging/visa-delete.webp',
      ),
    );

    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    vi.spyOn(dialog, 'confirm').mockReturnValue(of(true));

    const deactivateSpy = vi.spyOn(tiposPagoService, 'deactivate');

    await component.selectTipoPago(tipoPago);

    await component.onLogoSelected(
      createFileInputEvent(
        new File(['nuevo-logo'], 'visa-delete.png', {
          type: 'image/png',
        }),
      ),
    );

    await component.deleteTipoPago();

    expect(deactivateSpy).toHaveBeenCalledWith(2);

    expect(tiposPagoService.findById(2)).toBeNull();

    expect(component.selectedTipoPago()).toBeNull();

    expect(component.creatingTipoPago()).toBe(false);

    expect(discardStagedImageMock).toHaveBeenCalledWith('staging-visa-delete');

    fixture.destroy();

    /*
     * El componente ya dejó el staging a null,
     * por lo que destroy no debe descartarlo
     * una segunda vez.
     */
    expect(discardStagedImageMock).toHaveBeenCalledTimes(1);
  });

  it('no elimina el tipo de pago si se cancela la confirmación', async (): Promise<void> => {
    const fixture: ComponentFixture<ManagementPaymentTypesComponent> = TestBed.createComponent(
      ManagementPaymentTypesComponent,
    );

    const component: ManagementPaymentTypesComponent = fixture.componentInstance;

    const tipoPago: TipoPago = component.tiposPagoConfigurables()[0];

    vi.spyOn(dialog, 'confirm').mockReturnValue(of(false));

    const deactivateSpy = vi.spyOn(tiposPagoService, 'deactivate');

    await component.selectTipoPago(tipoPago);

    await component.deleteTipoPago();

    expect(deactivateSpy).not.toHaveBeenCalled();

    expect(component.selectedTipoPago()).toBe(tipoPago);

    expect(tiposPagoService.findById(2)).toBe(tipoPago);

    expect(discardStagedImageMock).not.toHaveBeenCalled();
  });
});

function createDropEvent(
  previousIndex: number,
  currentIndex: number,
): CdkDragDrop<readonly TipoPago[]> {
  return {
    previousIndex,
    currentIndex,
  } as unknown as CdkDragDrop<readonly TipoPago[]>;
}

function createStagedPaymentTypeImage(stagingId: string, url: string): StagedImageInterface {
  return {
    stagingId,
    purpose: 'payment_type_icon',
    originalName: 'logo.png',
    url,
    mimeType: 'image/webp',
    sizeBytes: 1024,
    width: 256,
    height: 256,
  };
}

function createFileInputEvent(file: File): Event {
  const inputElement: HTMLInputElement = document.createElement('input');

  Object.defineProperty(inputElement, 'files', {
    configurable: true,
    value: {
      item: (index: number): File | null => (index === 0 ? file : null),
    },
  });

  return {
    target: inputElement,
  } as unknown as Event;
}
