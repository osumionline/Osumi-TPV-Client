import type {
  ArticuloCodigoBarrasSaveInterface,
  ArticuloFotoSaveInterface,
  ArticuloSaveInterface,
} from '@desktop-contracts/articulos/articulo-save.interface';
import type {
  ArticuloCodigoBarrasDraft,
  ArticuloDraft,
  ArticuloFotoDraft,
} from '@model/articulos/articulo-draft.interface';

/**
 * Convierte un texto editable vacío en null.
 */
function normalizeOptionalText(value: string): string | null {
  const normalizedValue: string = value.trim();

  return normalizedValue === '' ? null : normalizedValue;
}

/**
 * Valida y convierte un draft en el contrato público de guardado.
 */
export function createArticuloSaveCommand(draft: ArticuloDraft): ArticuloSaveInterface {
  const nombre: string = draft.nombre.trim();

  if (nombre === '') {
    throw new Error('El artículo debe tener un nombre.');
  }

  if (draft.idMarca === null) {
    throw new Error('Debes seleccionar una marca.');
  }

  if (draft.ivaBps === null || draft.reBps === null) {
    throw new Error('Debes seleccionar la fiscalidad del artículo.');
  }

  const codigosBarrasAdicionales: readonly ArticuloCodigoBarrasSaveInterface[] =
    draft.codigosBarrasAdicionales.map(
      (codigo: ArticuloCodigoBarrasDraft): ArticuloCodigoBarrasSaveInterface => ({
        id: codigo.id,
        codigo: codigo.codigo.trim(),
      }),
    );

  const fotos: readonly ArticuloFotoSaveInterface[] = draft.fotos.map(
    (foto: ArticuloFotoDraft): ArticuloFotoSaveInterface => ({
      id: foto.id,
      stagingId: foto.stagingId,
      orden: foto.orden,
      principal: foto.principal,
    }),
  );

  return {
    id: draft.id,
    nombre,
    idMarca: draft.idMarca,
    idProveedor: draft.idProveedor,
    idsCategorias: [...draft.idsCategorias],
    referencia: normalizeOptionalText(draft.referencia),
    precioAlbaranMicros: draft.precioAlbaranMicros,
    pucMicros: draft.pucMicros,
    pvpCents: draft.pvpCents,
    pvpDescuentoCents: draft.pvpDescuentoCents,
    ivaBps: draft.ivaBps,
    reBps: draft.reBps,
    margenMicroporcentaje: draft.margenMicroporcentaje,
    margenDescuentoMicroporcentaje: draft.margenDescuentoMicroporcentaje,
    stock: draft.stock,
    stockMin: draft.stockMin,
    stockMax: draft.stockMax,
    loteOptimo: draft.loteOptimo,
    ventaOnline: draft.ventaOnline,
    mostrarEnWeb: draft.mostrarEnWeb,
    descripcionCorta: normalizeOptionalText(draft.descripcionCorta),
    descripcionLarga: normalizeOptionalText(draft.descripcionLarga),
    observaciones: normalizeOptionalText(draft.observaciones),
    mostrarObservacionesPedidos: draft.mostrarObservacionesPedidos,
    mostrarObservacionesVentas: draft.mostrarObservacionesVentas,
    accesoDirecto: draft.accesoDirecto,
    codigosBarrasAdicionales,
    fotos,
  };
}
