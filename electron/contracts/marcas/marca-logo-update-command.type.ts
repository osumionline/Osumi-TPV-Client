/**
 * Describe la modificación solicitada sobre
 * el logo de una Marca persistida.
 */
type MarcaLogoUpdateCommand =
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

export default MarcaLogoUpdateCommand;
