import catalogDatabaseSchema from '@infrastructure/database/schema/catalog.database-schema';
import coreDatabaseSchema from '@infrastructure/database/schema/core.database-schema';
import customersDatabaseSchema from '@infrastructure/database/schema/customers.database-schema';
import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import historyDatabaseSchema from '@infrastructure/database/schema/history.database-schema';
import inventoryDatabaseSchema from '@infrastructure/database/schema/inventory.database-schema';
import purchasesDatabaseSchema from '@infrastructure/database/schema/purchases.database-schema';
import salesDatabaseSchema from '@infrastructure/database/schema/sales.database-schema';

const completeDatabaseSchema: readonly DatabaseSchemaDefinition[] = [
  coreDatabaseSchema,
  catalogDatabaseSchema,
  inventoryDatabaseSchema,
  purchasesDatabaseSchema,
  customersDatabaseSchema,
  salesDatabaseSchema,
  historyDatabaseSchema,
];

export default completeDatabaseSchema;
