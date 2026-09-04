import salesDatabaseSchema from '@infrastructure/database/schema/sales.database-schema';
import { describe, expect, it } from 'vitest';

describe('salesDatabaseSchema', (): void => {
  it('modela estados, anulación y relaciones históricas de facturas', (): void => {
    const invoiceStatement: string | undefined = salesDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('CREATE TABLE factura ('),
    );

    const relationStatement: string | undefined = salesDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('CREATE TABLE factura_venta ('),
    );

    const activeRelationIndexStatement: string | undefined = salesDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('uq_factura_venta_venta_activa'),
    );

    expect(invoiceStatement).toBeDefined();
    expect(relationStatement).toBeDefined();
    expect(activeRelationIndexStatement).toBeDefined();

    const normalizedInvoiceStatement: string = (invoiceStatement ?? '').replace(/\s+/g, ' ').trim();

    const normalizedRelationStatement: string = (relationStatement ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedActiveRelationIndexStatement: string = (activeRelationIndexStatement ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    expect(normalizedInvoiceStatement).toContain('fecha_anulacion TEXT');

    expect(normalizedInvoiceStatement).toContain(
      "estado = 'borrador' AND numero IS NULL AND fecha_emision IS NULL AND fecha_anulacion IS NULL",
    );

    expect(normalizedInvoiceStatement).toContain(
      "estado = 'emitida' AND numero IS NOT NULL AND fecha_emision IS NOT NULL AND fecha_anulacion IS NULL",
    );

    expect(normalizedInvoiceStatement).toContain(
      "estado = 'anulada' AND numero IS NOT NULL AND fecha_emision IS NOT NULL AND fecha_anulacion IS NOT NULL",
    );

    expect(normalizedRelationStatement).toContain(
      'activa INTEGER NOT NULL DEFAULT 1 CHECK ( activa IN (0, 1) )',
    );

    expect(normalizedRelationStatement).not.toContain('UNIQUE ( id_venta )');

    expect(normalizedActiveRelationIndexStatement).toContain(
      'CREATE UNIQUE INDEX uq_factura_venta_venta_activa ON factura_venta ( id_venta ) WHERE activa = 1',
    );
  });
});
