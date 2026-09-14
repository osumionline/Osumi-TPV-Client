import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';

export default interface MarcaWorkspace {
  readonly marcaId: number | null;
  readonly marcaPublicId: string | null;
  readonly draft: MarcaFormModel;
  readonly baseSnapshot: MarcaFormModel;
  readonly activeSection: MarcaWorkspaceSection;
  readonly estadisticasFiltros: MarcaEstadisticasFiltros;
}
