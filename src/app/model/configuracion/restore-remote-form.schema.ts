import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type RestoreRemoteFormModel from '@model/configuracion/restore-remote-form.model';

/**
 * Valida las credenciales necesarias para acceder
 * temporalmente a TPV Backup durante un restore.
 */
export default function restoreRemoteFormSchema(
  path: SchemaPathTree<RestoreRemoteFormModel>,
): void {
  required(path.keyId, {
    message: 'El Key ID de TPV Backup es obligatorio.',
  });

  required(path.secret, {
    message: 'El Secret de TPV Backup es obligatorio.',
  });

  validate(path.keyId, ({ value }) => {
    const keyId: string = value();

    if (keyId !== '' && keyId.trim() === '') {
      return {
        kind: 'invalidBackupRemoteKeyId',

        message: 'El Key ID de TPV Backup no es válido.',
      };
    }

    return null;
  });
}
