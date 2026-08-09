import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';

type LegacyImportSqlInsertListener = (insert: LegacySqlInsert) => void;

export default LegacyImportSqlInsertListener;
