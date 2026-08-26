import VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type { VentaTicketRecord } from '@backend/domain/ventas/venta-ticket-record.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let repository: FakeVentasTicketsRepository;
let storage: FakeVentaTicketPdfStorage;
let service: VentasTicketsService;

describe('VentasTicketsService', (): void => {
  beforeEach((): void => {
    repository = new FakeVentasTicketsRepository();
    storage = new FakeVentaTicketPdfStorage();

    service = new VentasTicketsService(repository, storage);
  });

  it('no materializa una revisión que ya quedó obsoleta', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 2,
      ticketPdfRevision: 1,
    });

    await expect(service.savePdf(123, 1, createPdf())).rejects.toThrow(
      'El ticket ha cambiado mientras se generaba el PDF.',
    );

    expect(storage.saveCalls).toBe(0);
    expect(repository.markCalls).toBe(0);
  });

  it('es idempotente si la revisión ya está materializada y el archivo existe', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 2,
      ticketPdfRevision: 2,
    });

    storage.existsResult = true;

    await service.savePdf(123, 2, createPdf());

    expect(storage.saveCalls).toBe(0);
    expect(repository.markCalls).toBe(0);
  });

  it('regenera el archivo si SQLite lo marca vigente pero falta físicamente', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 2,
      ticketPdfRevision: 2,
    });

    storage.existsResult = false;

    await service.savePdf(123, 2, createPdf());

    expect(storage.saveCalls).toBe(1);
    expect(repository.markCalls).toBe(1);
  });

  it('guarda y confirma una revisión documental nueva', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 3,
      ticketPdfRevision: 2,
    });

    storage.existsResult = true;

    await service.savePdf(123, 3, createPdf());

    expect(storage.saveCalls).toBe(1);

    expect(repository.lastMarkedRevision).toBe(3);
  });

  it('rechaza marcar como vigente un PDF si la revisión cambia durante el guardado', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 3,
      ticketPdfRevision: 2,
    });

    repository.markResult = false;

    await expect(service.savePdf(123, 3, createPdf())).rejects.toThrow(
      'El ticket ha cambiado mientras se guardaba el PDF.',
    );

    expect(storage.saveCalls).toBe(1);
    expect(repository.markCalls).toBe(1);
  });
});

class FakeVentasTicketsRepository implements VentasTicketsRepository {
  ticket: VentaTicketRecord | null = createTicketRecord();

  markResult: boolean = true;

  markCalls: number = 0;

  lastMarkedRevision: number | null = null;

  /**
   * Devuelve el snapshot configurado para el test.
   */
  findByVentaId(): Promise<VentaTicketRecord | null> {
    return Promise.resolve(this.ticket);
  }

  /**
   * Simula la confirmación CAS de la revisión PDF.
   */
  markPdfRevision(_idVenta: number, expectedRevision: number): Promise<boolean> {
    this.markCalls += 1;
    this.lastMarkedRevision = expectedRevision;

    return Promise.resolve(this.markResult);
  }
}

class FakeVentaTicketPdfStorage implements VentaTicketPdfStorage {
  existsResult: boolean = false;

  saveCalls: number = 0;

  /**
   * Devuelve la existencia configurada para el test.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.existsResult);
  }

  /**
   * Registra una materialización simulada.
   */
  save(): Promise<void> {
    this.saveCalls += 1;

    return Promise.resolve();
  }
}

/**
 * Construye un snapshot documental mínimo.
 */
function createTicketRecord(
  overrides: {
    readonly ticketRevision?: number;
    readonly ticketPdfRevision?: number;
  } = {},
): VentaTicketRecord {
  return {
    id: 123,
    publicId: 'venta-123',
    serie: '',
    numero: 123,
    fecha: '2026-08-26T00:00:00.000Z',
    empleadoNombre: 'Empleado',
    clienteNombre: null,
    totalCents: 1_000,
    ticketRevision: overrides.ticketRevision ?? 1,
    ticketPdfRevision: overrides.ticketPdfRevision ?? 0,
    pagos: [],
    lineas: [],
  };
}

/**
 * Construye un PDF mínimo válido para los tests.
 */
function createPdf(): Uint8Array {
  return new TextEncoder().encode('%PDF-1.7\ntest\n%%EOF');
}
