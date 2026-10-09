import { inject, Service } from '@angular/core';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type VentaDevolucionSeleccion from '@model/ventas/venta-devolucion-seleccion.interface';
import type VentaDevolucionSelectorState from '@model/ventas/venta-devolucion-selector-state.interface';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import ApplicationLoggingService from '@services/application/application-logging.service';

/**
 * Proporciona al renderer las consultas y reconciliaciones necesarias
 * para realizar devoluciones de ventas históricas.
 */
@Service()
export default class VentasDevolucionesService {
  private readonly loggingService: ApplicationLoggingService = inject(ApplicationLoggingService);

  /**
   * Recupera una venta histórica mediante su identificador interno.
   */
  async getDevolucion(idVenta: number): Promise<VentaDevolucionInterface | null> {
    return window.osumiDesktop.ventas.getDevolucion(idVenta);
  }

  /**
   * Reconcilia una devolución ya incorporada a una venta abierta
   * con el estado histórico recuperado actualmente.
   *
   * Los cambios normales de disponibilidad se devuelven como error
   * de negocio sin registrarlos como incidencia técnica.
   */
  reconcileDevolucionEnCurso(
    venta: VentaEnCurso,
    devolucion: VentaDevolucionInterface | null,
  ): VentaDevolucionSelectorState {
    const origen = venta.devolucionOrigen;

    if (origen === null) {
      throw new Error('La venta no contiene una devolución en curso.');
    }

    if (devolucion === null) {
      const error: Error = new Error(
        'No se ha podido recuperar el ticket original de la devolución.',
      );

      this.loggingService.warn({
        area: 'ventas',
        operation: 'reconcile-return',
        message: 'No se ha podido reconciliar una devolución con su venta histórica.',
        error,
        context: {
          sourceSaleId: origen.id,
          reason: 'source-missing',
        },
      });

      throw error;
    }

    if (devolucion.id !== origen.id || devolucion.publicId !== origen.publicId) {
      const error: Error = new Error(
        'El ticket recuperado no coincide con la devolución en curso.',
      );

      this.loggingService.warn({
        area: 'ventas',
        operation: 'reconcile-return',
        message: 'No se ha podido reconciliar una devolución con su venta histórica.',
        error,
        context: {
          sourceSaleId: origen.id,
          returnedSaleId: devolucion.id,
          reason: 'source-mismatch',
        },
      });

      throw error;
    }

    const seleccionInicial: VentaDevolucionSeleccion[] = [];

    for (const lineaVenta of venta.lineas) {
      if (!lineaVenta.esDevolucion) {
        continue;
      }

      const lineaOrigen = lineaVenta.devolucionOrigen;

      if (lineaOrigen === null) {
        /*
         * esDevolucion depende actualmente de devolucionOrigen,
         * por lo que esta rama es defensiva frente a futuras
         * modificaciones del modelo.
         */
        const error: Error = new Error(
          'Una línea de devolución no dispone de su referencia histórica.',
        );

        this.loggingService.warn({
          area: 'ventas',
          operation: 'reconcile-return',
          message: 'No se ha podido reconciliar una devolución con su venta histórica.',
          error,
          context: {
            sourceSaleId: origen.id,
            reason: 'line-origin-missing',
          },
        });

        throw error;
      }

      const lineaHistorica = devolucion.lineas.find(
        (linea): boolean => linea.id === lineaOrigen.id,
      );

      if (lineaHistorica === undefined) {
        const error: Error = new Error(
          'Una de las líneas de la devolución ya no existe en el ticket original.',
        );

        this.loggingService.warn({
          area: 'ventas',
          operation: 'reconcile-return',
          message: 'No se ha podido reconciliar una devolución con su venta histórica.',
          error,
          context: {
            sourceSaleId: origen.id,
            sourceLineId: lineaOrigen.id,
            reason: 'line-missing',
          },
        });

        throw error;
      }

      const unidades: number = lineaVenta.unidadesDevolucion;

      if (unidades > lineaHistorica.unidadesDisponibles) {
        throw new Error('La disponibilidad del ticket ha cambiado y la devolución debe revisarse.');
      }

      seleccionInicial.push({
        linea: lineaHistorica,
        unidades,
      });
    }

    return {
      devolucion,
      seleccionInicial,
    };
  }
}
