import type { VentaFinalizacionResultado } from '@model/ventas/venta-finalizacion-resultado.interface';

export default interface VentaFinalizacionSolicitud {
  readonly finalizacion: VentaFinalizacionResultado;
  readonly imprimirTicket: boolean;
}
