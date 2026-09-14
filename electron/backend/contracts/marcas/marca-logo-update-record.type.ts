import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

/**
 * Describe cómo debe quedar el logo persistido
 * después de actualizar una Marca.
 */
type MarcaLogoUpdateRecord =
  | {
      readonly action: 'keep';
    }
  | {
      readonly action: 'remove';
    }
  | {
      readonly action: 'replace';
      readonly nuevoArchivo: ArchivoCreateRecord;
    };

export default MarcaLogoUpdateRecord;
