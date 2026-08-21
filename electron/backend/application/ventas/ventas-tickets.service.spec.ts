import VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type VentaTicketPdfStorage from '@backend/contracts/ventas/venta-ticket-pdf-storage.interface';
import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import type { VentaTicketRecord } from '@backend/domain/ventas/venta-ticket-record.interface';
import { describe, expect, it } from 'vitest';

describe('VentasTicketsService', (): void => {
  it('guarda el PDF cuando la venta existe', async (): Promise<void> => {
    const repository: FakeVentasTicketsRepository = new FakeVentasTicketsRepository(
      createVentaTicketRecord(),
    );

    const storage: FakeVentaTicketPdfStorage = new FakeVentaTicketPdfStorage();

    const service: VentasTicketsService = new VentasTicketsService(repository, storage);

    const pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');

    await service.savePdf(123, pdf);

    expect(repository.requestedVentaIds).toEqual([123]);
    expect(storage.savedVentaId).toBe(123);
    expect(storage.savedPdf).toBe(pdf);
  });

  it('rechaza guardar un PDF para una venta inexistente', async (): Promise<void> => {
    const repository: FakeVentasTicketsRepository = new FakeVentasTicketsRepository(null);

    const storage: FakeVentaTicketPdfStorage = new FakeVentaTicketPdfStorage();

    const service: VentasTicketsService = new VentasTicketsService(repository, storage);

    const pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');

    await expect(service.savePdf(123, pdf)).rejects.toThrow(
      'No se ha encontrado la venta asociada al PDF del ticket.',
    );

    expect(storage.savedVentaId).toBeNull();
    expect(storage.savedPdf).toBeNull();
  });

  it('rechaza el identificador antes de consultar SQLite', async (): Promise<void> => {
    const repository: FakeVentasTicketsRepository = new FakeVentasTicketsRepository(
      createVentaTicketRecord(),
    );

    const storage: FakeVentaTicketPdfStorage = new FakeVentaTicketPdfStorage();

    const service: VentasTicketsService = new VentasTicketsService(repository, storage);

    const pdf: Uint8Array = new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF');

    await expect(service.savePdf(0, pdf)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    expect(repository.requestedVentaIds).toEqual([]);
    expect(storage.savedVentaId).toBeNull();
  });
});

class FakeVentasTicketsRepository implements VentasTicketsRepository {
  readonly requestedVentaIds: number[] = [];

  constructor(private readonly result: VentaTicketRecord | null) {}

  findByVentaId(idVenta: number): Promise<VentaTicketRecord | null> {
    this.requestedVentaIds.push(idVenta);

    return Promise.resolve(this.result);
  }
}

class FakeVentaTicketPdfStorage implements VentaTicketPdfStorage {
  savedVentaId: number | null = null;
  savedPdf: Uint8Array | null = null;

  save(idVenta: number, pdf: Uint8Array): Promise<void> {
    this.savedVentaId = idVenta;
    this.savedPdf = pdf;

    return Promise.resolve();
  }
}

function createVentaTicketRecord(): VentaTicketRecord {
  return {
    id: 123,
    publicId: 'venta-public-id',
    serie: 'A',
    numero: 456,
    fecha: '2026-08-21T18:00:00.000Z',
    empleadoNombre: 'Empleado',
    clienteNombre: null,
    totalCents: 2_000,
    pagos: [],
    lineas: [],
  };
}
