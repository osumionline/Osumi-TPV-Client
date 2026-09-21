import { min, validate, type SchemaPathTree } from '@angular/forms/signals';
import type { CajaCierreFormModel } from '@model/caja/caja-cierre-form.model';

/**
 * Define las validaciones de los importes y del recuento
 * durante la preparación del cierre de caja.
 */
export default function cajaCierreFormSchema(path: SchemaPathTree<CajaCierreFormModel>): void {
  min(path.retiradoEuros, 0, {
    message: 'El importe retirado no puede ser negativo.',
  });

  min(path.entradaEuros, 0, {
    message: 'La entrada no puede ser negativa.',
  });

  const cantidadPaths = [
    path.recuento.cent1,
    path.recuento.cent2,
    path.recuento.cent5,
    path.recuento.cent10,
    path.recuento.cent20,
    path.recuento.cent50,

    path.recuento.euro1,
    path.recuento.euro2,
    path.recuento.euro5,
    path.recuento.euro10,
    path.recuento.euro20,
    path.recuento.euro50,
    path.recuento.euro100,
    path.recuento.euro200,
    path.recuento.euro500,
  ] as const;

  for (const cantidadPath of cantidadPaths) {
    validate(cantidadPath, ({ value }) => {
      const cantidad: number | null = value();

      if (cantidad === null) {
        return null;
      }

      if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
        return {
          kind: 'cantidadRecuento',
          message: 'La cantidad debe ser un entero mayor o igual que cero.',
        };
      }

      return null;
    });
  }
}
