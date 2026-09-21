import { min, type SchemaPathTree } from '@angular/forms/signals';
import type CajaCierreFormModel from '@model/caja/caja-cierre-form.model';

/**
 * Define las validaciones de los importes editables
 * durante la preparación del cierre de caja.
 */
export default function cajaCierreFormSchema(path: SchemaPathTree<CajaCierreFormModel>): void {
  min(path.retiradoEuros, 0, {
    message: 'El importe retirado no puede ser negativo.',
  });

  min(path.entradaEuros, 0, {
    message: 'La entrada no puede ser negativa.',
  });
}
