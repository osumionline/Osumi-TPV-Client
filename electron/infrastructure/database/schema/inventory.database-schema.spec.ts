import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import inventoryDatabaseSchema from '@infrastructure/database/schema/inventory.database-schema';
import { describe, expect, it } from 'vitest';

describe('inventoryDatabaseSchema', (): void => {
  it('modela las categorías de artículos mediante una relación N:M', (): void => {
    const articleStatement: string | undefined = inventoryDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('CREATE TABLE articulo ('),
    );
    const relationStatement: string | undefined = inventoryDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('CREATE TABLE articulo_categoria ('),
    );

    expect(articleStatement).toBeDefined();
    expect(relationStatement).toBeDefined();

    const normalizedArticleStatement: string = (articleStatement ?? '').replace(/\s+/g, ' ').trim();
    const normalizedRelationStatement: string = (relationStatement ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    expect(normalizedArticleStatement).not.toContain('id_categoria INTEGER');
    expect(normalizedRelationStatement).toContain('PRIMARY KEY ( id_articulo, id_categoria )');
    expect(normalizedRelationStatement).toContain(
      'FOREIGN KEY ( id_articulo ) REFERENCES articulo ( id )',
    );
    expect(normalizedRelationStatement).toContain(
      'FOREIGN KEY ( id_categoria ) REFERENCES categoria ( id )',
    );
    expect(completeDatabaseSchemaTables).toContain('articulo_categoria');
  });

  it('conserva en caducidades un snapshot histórico independiente del artículo actual', (): void => {
    const expirationStatement: string | undefined = inventoryDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('CREATE TABLE merma_caducidad ('),
    );

    const brandIndexStatement: string | undefined = inventoryDatabaseSchema.statements.find(
      (statement: string): boolean => statement.includes('idx_merma_caducidad_marca_fecha_activa'),
    );

    expect(expirationStatement).toBeDefined();
    expect(brandIndexStatement).toBeDefined();

    const normalizedStatement: string = (expirationStatement ?? '').replace(/\s+/g, ' ').trim();

    expect(normalizedStatement).toContain('localizador_snapshot INTEGER NOT NULL');
    expect(normalizedStatement).toContain('id_marca_snapshot INTEGER NOT NULL');
    expect(normalizedStatement).toContain('marca_nombre_snapshot TEXT NOT NULL');
    expect(normalizedStatement).toContain('articulo_nombre_snapshot TEXT NOT NULL');
    expect(normalizedStatement).toContain('puc_micros INTEGER NOT NULL');
    expect(normalizedStatement).toContain('pvp_cents INTEGER NOT NULL');
    expect(normalizedStatement).toContain('fecha_baja TEXT NOT NULL');

    expect(normalizedStatement).not.toContain('FOREIGN KEY ( id_marca_snapshot )');
  });
});
