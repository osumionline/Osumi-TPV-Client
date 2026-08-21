import { inject, Service } from '@angular/core';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import mapVentaToGuardarVentaCommand from '@model/ventas/guardar-venta-command.mapper';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type { VentaFinalizacionResultado } from '@model/ventas/venta-finalizacion-resultado.interface';
import VentasContextService from '@services/ventas-context.service';

@Service()
export default class VentasPersistenciaService {
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);

  /**
   * Persiste definitivamente una venta ya liquidada.
   *
   * El comando se construye en el último momento para que
   * tanto la venta como la caja correspondan exactamente
   * al estado vigente cuando se inicia la persistencia.
   */
  async save(
    venta: VentaEnCurso,
    finalizacion: VentaFinalizacionResultado,
  ): Promise<GuardarVentaResult> {
    const cajaAbierta: CajaAbiertaInterface | null = this.ventasContextService.cajaAbierta();

    if (cajaAbierta === null) {
      throw new Error('No se puede finalizar una venta sin una caja abierta.');
    }

    const command: GuardarVentaCommand = mapVentaToGuardarVentaCommand(
      venta,
      finalizacion,
      cajaAbierta.publicId,
    );

    return window.osumiDesktop.ventas.save(command);
  }
}
