export type ClienteFacturaEstado = 'borrador' | 'emitida' | 'anulada';

export interface ClienteFacturaCapacidadesInterface {
  readonly puedeEditar: boolean;
  readonly puedeEliminar: boolean;
  readonly puedePrevisualizar: boolean;
  readonly puedeFacturar: boolean;
  readonly puedeImprimir: boolean;
  readonly puedeEnviarEmail: boolean;
  readonly puedeAnular: boolean;
}

export interface ClienteFacturaInterface {
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number | null;
  readonly year: number | null;
  /**
   * Número preparado para mostrar, con formato
   * numero_año. Es null para los borradores.
   */
  readonly numeroFactura: string | null;
  readonly estado: ClienteFacturaEstado;
  /**
   * Fecha utilizada por el listado: creación para
   * borradores y emisión para el resto.
   */
  readonly fecha: string;
  readonly fechaCreacion: string;
  readonly fechaEmision: string | null;
  readonly fechaAnulacion: string | null;
  readonly importeCents: number;
  readonly capacidades: ClienteFacturaCapacidadesInterface;
}
