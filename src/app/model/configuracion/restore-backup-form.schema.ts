import { validate, type SchemaPathTree } from '@angular/forms/signals';
import type RestoreBackupFormModel from '@model/configuracion/restore-backup-form.model';

/**
 * Define la validación del formulario utilizado
 * para desbloquear una copia v3.
 *
 * La clave se trata como material opaco:
 * no se aplica trim ni ninguna normalización.
 */
export default function restoreBackupFormSchema(
  path: SchemaPathTree<RestoreBackupFormModel>,
): void {
  validate(path.backupApiKey, ({ value }) => {
    if (value().length === 0) {
      return {
        kind: 'required',
        message: 'La TPV Backup key es obligatoria.',
      };
    }

    return null;
  });
}
