export type VentaEditableField =
  'cantidad' | 'importe' | 'descuento-porcentaje' | 'descuento-importe';

export type VentaFocusTarget =
  | {
      readonly type: 'localizador';
    }
  | {
      readonly type: 'linea';
      readonly lineaIdTemporal: string;
      readonly field: VentaEditableField;
    };

export interface VentaWorkspacePosition {
  readonly x: number;
  readonly y: number;
}

export interface VentaWorkspaceState {
  readonly focusTarget: VentaFocusTarget;
  readonly totalPosition: VentaWorkspacePosition;
}
