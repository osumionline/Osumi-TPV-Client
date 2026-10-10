import { TestBed } from '@angular/core/testing';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import Cliente from '@model/clientes/cliente.model';
import ApplicationLoggingService from '@services/application/application-logging.service';
import ProvinciasService from '@services/application/provincias.service';
import ClienteProteccionDatosPrintService from '@services/clientes/cliente-proteccion-datos-print.service';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

describe('ClienteProteccionDatosPrintService', (): void => {
  let warnMock: Mock;

  beforeEach((): void => {
    warnMock = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        ClienteProteccionDatosPrintService,
        {
          provide: ProvinciasService,
          useValue: {},
        },
        {
          provide: ApplicationLoggingService,
          useValue: {
            warn: warnMock,
          },
        },
      ],
    });
  });

  afterEach((): void => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('construye y abre el documento sin registrar incidencias', (): void => {
    const printWindow: Window = createPrintWindow();

    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);

    const service: ClienteProteccionDatosPrintService = TestBed.inject(
      ClienteProteccionDatosPrintService,
    );

    service.print(createAppData(), createCliente());

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'popup=yes,width=1000,height=900');

    expect(printWindow.document.write).toHaveBeenCalledWith(
      expect.stringContaining('Ficha de cliente e información sobre protección de datos'),
    );

    expect(printWindow.print).toHaveBeenCalledOnce();
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('registra y propaga un fallo al abrir el documento', (): void => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    const service: ClienteProteccionDatosPrintService = TestBed.inject(
      ClienteProteccionDatosPrintService,
    );

    expect((): void => {
      service.print(createAppData(), createCliente());
    }).toThrow('No se ha podido abrir la ventana del documento de protección de datos.');

    expect(warnMock).toHaveBeenCalledOnce();

    expect(warnMock).toHaveBeenCalledWith({
      area: 'clientes',
      operation: 'print-data-protection-document',
      message: 'No se ha podido abrir el documento de protección de datos.',
      error: expect.objectContaining({
        message: 'No se ha podido abrir la ventana del documento de protección de datos.',
      }),
    });
  });
});

/**
 * Crea una ventana mínima suficiente para probar
 * el helper real de impresión HTML.
 */
function createPrintWindow(): Window {
  const documentOpen = vi.fn();
  const documentWrite = vi.fn();
  const documentClose = vi.fn();
  const getElementById = vi.fn((): HTMLElement | null => null);
  const focus = vi.fn();
  const print = vi.fn();
  const close = vi.fn();

  const printWindow = {
    closed: false,
    close,
    focus,
    print,
    document: {
      open: documentOpen,
      write: documentWrite,
      close: documentClose,
      getElementById,
    },
    requestAnimationFrame: (callback: FrameRequestCallback): number => {
      callback(0);

      return 1;
    },
  };

  return printWindow as unknown as Window;
}

/**
 * Crea una configuración suficiente para generar
 * el documento de protección de datos.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-08-01T10:00:00.000Z',
    nombre: 'Empresa de prueba',
    nombreComercial: 'Comercio de prueba',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Gran Vía 1',
    poblacion: 'Bilbao',
    email: 'tienda@example.com',
    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Adjuntamos el ticket correspondiente a su compra.\nGracias por su confianza.',
    },
    tipoIva: 'iva',
    ivaList: [21, 10, 4],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    backupAutomaticTime: '03:00',
    fechaCad: false,
  };
}

/**
 * Crea un cliente mínimo suficiente para generar
 * el documento de protección de datos.
 */
function createCliente(): Cliente {
  const cliente: Cliente = new Cliente();

  cliente.id = 7;
  cliente.publicId = 'cliente-public-id';
  cliente.nombreApellidos = 'Cliente de prueba';

  return cliente;
}
