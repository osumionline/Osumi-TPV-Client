import type { ArticuloDraft } from '@model/articulos/articulo-draft.interface';

export default interface ArticuloWorkspaceTab {
  readonly idTemporal: string;
  readonly draft: ArticuloDraft;
  readonly baseSnapshot: ArticuloDraft;
  readonly dirty: boolean;
}
