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

  it('recupera el PDF cuando representa la revisión documental vigente', async (): Promise<void> => {
    const pdf: Uint8Array = createPdf();

    repository.ticket = createTicketRecord({
      ticketRevision: 2,
      ticketPdfRevision: 2,
    });

    storage.readResult = pdf;

    const result: Uint8Array | null = await service.getCurrentPdf(123);

    expect(result).toBe(pdf);
    expect(storage.readCalls).toBe(1);
  });

  it('no lee el filesystem cuando el PDF ya está marcado como desactualizado', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 3,
      ticketPdfRevision: 2,
    });

    const result: Uint8Array | null = await service.getCurrentPdf(123);

    expect(result).toBeNull();
    expect(storage.readCalls).toBe(0);
  });

  it('devuelve null cuando falta físicamente el PDF vigente', async (): Promise<void> => {
    repository.ticket = createTicketRecord({
      ticketRevision: 2,
      ticketPdfRevision: 2,
    });

    storage.readResult = null;

    expect(await service.getCurrentPdf(123)).toBeNull();
  });

  it('descarta el PDF si la revisión cambia mientras se está leyendo', async (): Promise<void> => {
    repository.queuedTickets.push(
      createTicketRecord({
        ticketRevision: 2,
        ticketPdfRevision: 2,
      }),
      createTicketRecord({
        ticketRevision: 3,
        ticketPdfRevision: 2,
      }),
    );

    storage.readResult = createPdf();

    expect(await service.getCurrentPdf(123)).toBeNull();
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
  readonly queuedTickets: (VentaTicketRecord | null)[] = [];

  /**
   * Devuelve el siguiente snapshot encolado o el
   * snapshot estable configurado para el test.
   */
  findByVentaId(): Promise<VentaTicketRecord | null> {
    const queuedTicket: VentaTicketRecord | null | undefined = this.queuedTickets.shift();

    return Promise.resolve(queuedTicket === undefined ? this.ticket : queuedTicket);
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
  readResult: Uint8Array | null = null;
  readCalls: number = 0;

  /**
   * Devuelve la existencia configurada para el test.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(this.existsResult);
  }

  /**
   * Simula la lectura del PDF vigente.
   */
  read(): Promise<Uint8Array | null> {
    this.readCalls += 1;

    return Promise.resolve(this.readResult);
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
