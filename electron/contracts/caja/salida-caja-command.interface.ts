export interface CrearSalidaCajaCommand {
  readonly cajaPublicId: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importeCents: number;
}

export interface ActualizarSalidaCajaCommand {
  readonly publicId: string;
  readonly cajaPublicId: string;
  readonly concepto: string;
  readonly descripcion: string | null;
  readonly importeCents: number;
}

export interface EliminarSalidaCajaCommand {
  readonly publicId: string;
  readonly cajaPublicId: string;
}
