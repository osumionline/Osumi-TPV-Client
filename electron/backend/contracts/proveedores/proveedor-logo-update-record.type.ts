import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';

/**
 * Describe cómo debe quedar el logo persistido
 * después de actualizar un Proveedor.
 */
type ProveedorLogoUpdateRecord =
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

export default ProveedorLogoUpdateRecord;
