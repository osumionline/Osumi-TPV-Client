import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type {
  ArticuloCodigoBarrasDraft,
  ArticuloDraft,
  ArticuloFotoDraft,
} from '@model/articulos/articulo-draft.interface';

/**
 * Crea el estado inicial de un artículo todavía no persistido.
 */
export function createEmptyArticuloDraft(): ArticuloDraft {
  return {
    id: null,
    publicId: null,
    localizador: null,
    nombre: '',
    idMarca: null,
    idProveedor: null,
    idsCategorias: [],
    referencia: '',
    precioAlbaranMicros: 0,
    pucMicros: 0,
    pvpCents: 0,
    pvpDescuentoCents: null,
    ivaBps: null,
    reBps: null,
    margenMicroporcentaje: 0,
    margenDescuentoMicroporcentaje: null,
    stock: 0,
    stockMin: 0,
    stockMax: 0,
    loteOptimo: 0,
    ventaOnline: false,
    mostrarEnWeb: false,
    descripcionCorta: '',
    descripcionLarga: '',
    observaciones: '',
    mostrarObservacionesPedidos: false,
    mostrarObservacionesVentas: false,
    accesoDirecto: null,
    codigosBarrasAdicionales: [],
    fotos: [],
  };
}

/**
 * Convierte un artículo persistido al estado editable del workspace.
 */
export function createArticuloDraftFromInterface(articulo: ArticuloInterface): ArticuloDraft {
  const codigosBarrasAdicionales: readonly ArticuloCodigoBarrasDraft[] = articulo.codigosBarras
    .filter((codigo): boolean => !codigo.porDefecto)
    .map((codigo): ArticuloCodigoBarrasDraft => ({
      id: codigo.id,
      codigo: codigo.codigo,
    }));

  const fotos: readonly ArticuloFotoDraft[] = articulo.fotos.map((foto): ArticuloFotoDraft => ({
    id: foto.id,
    stagingId: null,
    originalName: foto.originalName,
    url: foto.url,
    mimeType: foto.mimeType,
    sizeBytes: foto.sizeBytes,
    width: foto.width,
    height: foto.height,
    orden: foto.orden,
    principal: foto.principal,
  }));

  return cloneArticuloDraft({
    id: articulo.id,
    publicId: articulo.publicId,
    localizador: articulo.localizador,
    nombre: articulo.nombre,
    idMarca: articulo.idMarca,
    idProveedor: articulo.idProveedor,
    idsCategorias: articulo.idsCategorias,
    referencia: articulo.referencia ?? '',
    precioAlbaranMicros: articulo.precioAlbaranMicros,
    pucMicros: articulo.pucMicros,
    pvpCents: articulo.pvpCents,
    pvpDescuentoCents: articulo.pvpDescuentoCents,
    ivaBps: articulo.ivaBps,
    reBps: articulo.reBps,
    margenMicroporcentaje: articulo.margenMicroporcentaje,
    margenDescuentoMicroporcentaje: articulo.margenDescuentoMicroporcentaje,
    stock: articulo.stock,
    stockMin: articulo.stockMin,
    stockMax: articulo.stockMax,
    loteOptimo: articulo.loteOptimo,
    ventaOnline: articulo.ventaOnline,
    mostrarEnWeb: articulo.mostrarEnWeb,
    descripcionCorta: articulo.descripcionCorta ?? '',
    descripcionLarga: articulo.descripcionLarga ?? '',
    observaciones: articulo.observaciones ?? '',
    mostrarObservacionesPedidos: articulo.mostrarObservacionesPedidos,
    mostrarObservacionesVentas: articulo.mostrarObservacionesVentas,
    accesoDirecto: articulo.accesoDirecto,
    codigosBarrasAdicionales,
    fotos,
  });
}

/**
 * Crea una copia independiente y normalizada de un draft.
 */
export function cloneArticuloDraft(draft: ArticuloDraft): ArticuloDraft {
  return {
    id: draft.id,
    publicId: draft.publicId,
    localizador: draft.localizador,
    nombre: draft.nombre,
    idMarca: draft.idMarca,
    idProveedor: draft.idProveedor,
    idsCategorias: [...draft.idsCategorias].sort((a: number, b: number): number => a - b),
    referencia: draft.referencia,
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
    descripcionCorta: draft.descripcionCorta,
    descripcionLarga: draft.descripcionLarga,
    observaciones: draft.observaciones,
    mostrarObservacionesPedidos: draft.mostrarObservacionesPedidos,
    mostrarObservacionesVentas: draft.mostrarObservacionesVentas,
    accesoDirecto: draft.accesoDirecto,
    codigosBarrasAdicionales: draft.codigosBarrasAdicionales.map(
      (codigo): ArticuloCodigoBarrasDraft => ({
        id: codigo.id,
        codigo: codigo.codigo,
      }),
    ),
    fotos: draft.fotos.map((foto): ArticuloFotoDraft => ({
      id: foto.id,
      stagingId: foto.stagingId,
      originalName: foto.originalName,
      url: foto.url,
      mimeType: foto.mimeType,
      sizeBytes: foto.sizeBytes,
      width: foto.width,
      height: foto.height,
      orden: foto.orden,
      principal: foto.principal,
    })),
  };
}

/**
 * Compara dos drafts teniendo en cuenta su contenido editable completo.
 */
export function areArticuloDraftsEqual(left: ArticuloDraft, right: ArticuloDraft): boolean {
  return JSON.stringify(cloneArticuloDraft(left)) === JSON.stringify(cloneArticuloDraft(right));
}
