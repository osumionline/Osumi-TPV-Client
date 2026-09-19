import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import ManagementPaymentTypesComponent from '@modules/gestion/pages/management-payment-types/management-payment-types.component';
import FilesService from '@services/application/files.service';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { vi } from 'vitest';

describe('ManagementPaymentTypesComponent', (): void => {
  let originalDesktopDescriptor: PropertyDescriptor | undefined;
  let tiposPagoService: TiposPagoService;
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

    await tiposPagoService.load();
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
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
});

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
