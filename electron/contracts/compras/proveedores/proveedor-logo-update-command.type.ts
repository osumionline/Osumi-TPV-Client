/**
 * Describe la modificación solicitada sobre
 * el logo de un Proveedor persistido.
 */
type ProveedorLogoUpdateCommand =
  | {
      readonly action: 'keep';
    }
  | {
      readonly action: 'remove';
    }
  | {
      readonly action: 'replace';
      readonly stagingId: string;
    };

export default ProveedorLogoUpdateCommand;
