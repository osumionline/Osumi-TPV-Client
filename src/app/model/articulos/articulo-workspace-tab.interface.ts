import type { ArticuloDraft } from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';

export default interface ArticuloWorkspaceTab {
  readonly idTemporal: string;
  readonly draft: ArticuloDraft;
  readonly baseSnapshot: ArticuloDraft;
  readonly dirty: boolean;
  readonly activeSection: ArticuloWorkspaceSection;
}
