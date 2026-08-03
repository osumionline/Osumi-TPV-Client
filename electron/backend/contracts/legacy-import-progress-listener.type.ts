import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';

type LegacyImportProgressListener = (progress: LegacyImportProgress) => void;

export default LegacyImportProgressListener;
