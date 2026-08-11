import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type Cliente from '@model/clientes/cliente.model';
import type Empleado from '@model/empleados/empleado.model';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import VentaEnCurso from '@model/ventas/venta-en-curso.model';
import VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type {
  VentaFocusTarget,
  VentaWorkspaceState,
} from '@model/ventas/venta-workspace.interface';

/**
 * Mantiene las ventas abiertas y su workspace durante toda la sesión de la aplicación.
 */
@Service()
export default class VentasService {
  private readonly ventasSignal: WritableSignal<readonly VentaEnCurso[]> = signal<
    readonly VentaEnCurso[]
  >([]);

  private readonly ventaActivaIdSignal: WritableSignal<string | null> = signal<string | null>(null);

  private readonly workspacesSignal: WritableSignal<ReadonlyMap<string, VentaWorkspaceState>> =
    signal<ReadonlyMap<string, VentaWorkspaceState>>(new Map<string, VentaWorkspaceState>());

  private nextVentaNumber: number = 1;

  readonly ventas: Signal<readonly VentaEnCurso[]> = this.ventasSignal.asReadonly();

  readonly ventaActivaId: Signal<string | null> = this.ventaActivaIdSignal.asReadonly();

  readonly hasVentas: Signal<boolean> = computed((): boolean => this.ventas().length > 0);

  readonly ventaActiva: Signal<VentaEnCurso | null> = computed((): VentaEnCurso | null => {
    const ventaActivaId: string | null = this.ventaActivaId();

    if (ventaActivaId === null) {
      return null;
    }

    return this.findById(ventaActivaId);
  });

  readonly workspaceActivo: Signal<VentaWorkspaceState | null> = computed(
    (): VentaWorkspaceState | null => {
      const ventaActivaId: string | null = this.ventaActivaId();

      if (ventaActivaId === null) {
        return null;
      }

      return this.workspacesSignal().get(ventaActivaId) ?? null;
    },
  );

  /**
   * Crea una nueva venta en memoria y la convierte en la venta activa.
   */
  crearVenta(empleado: Empleado | null = null): VentaEnCurso {
    const venta: VentaEnCurso = new VentaEnCurso(this.nextVentaNumber);

    if (empleado !== null) {
      venta.setEmpleado(empleado);
    }

    this.nextVentaNumber++;

    this.ventasSignal.update((ventas: readonly VentaEnCurso[]): readonly VentaEnCurso[] => [
      ...ventas,
      venta,
    ]);

    const workspaces: Map<string, VentaWorkspaceState> = new Map<string, VentaWorkspaceState>(
      this.workspacesSignal(),
    );

    workspaces.set(venta.idTemporal, {
      focusTarget: {
        type: 'localizador',
      },
      totalPosition: {
        x: 0,
        y: 0,
      },
    });

    this.workspacesSignal.set(workspaces);
    this.ventaActivaIdSignal.set(venta.idTemporal);

    return venta;
  }

  /**
   * Cierra una venta en curso sin persistirla y selecciona la pestaña más próxima.
   */
  cerrarVenta(ventaIdTemporal: string): void {
    const ventasActuales: readonly VentaEnCurso[] = this.ventas();

    const index: number = ventasActuales.findIndex(
      (venta: VentaEnCurso): boolean => venta.idTemporal === ventaIdTemporal,
    );

    if (index === -1) {
      return;
    }

    const ventas: readonly VentaEnCurso[] = ventasActuales.filter(
      (venta: VentaEnCurso): boolean => venta.idTemporal !== ventaIdTemporal,
    );

    const workspaces: Map<string, VentaWorkspaceState> = new Map<string, VentaWorkspaceState>(
      this.workspacesSignal(),
    );

    workspaces.delete(ventaIdTemporal);

    this.ventasSignal.set(ventas);
    this.workspacesSignal.set(workspaces);

    if (this.ventaActivaId() === ventaIdTemporal) {
      const siguiente: VentaEnCurso | undefined = ventas[index] ?? ventas[index - 1];

      this.ventaActivaIdSignal.set(siguiente?.idTemporal ?? null);
    }

    if (ventas.length === 0) {
      this.nextVentaNumber = 1;
    }
  }

  /**
   * Selecciona una de las ventas abiertas mediante su identificador temporal.
   */
  seleccionarVenta(ventaIdTemporal: string): void {
    if (this.findById(ventaIdTemporal) === null) {
      throw new Error('No se puede seleccionar una venta que no está abierta.');
    }

    this.ventaActivaIdSignal.set(ventaIdTemporal);
  }

  /**
   * Asigna o cambia el empleado responsable de una venta abierta.
   */
  asignarEmpleado(ventaIdTemporal: string, empleado: Empleado): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    venta.setEmpleado(empleado);

    this.notifyVentasChanged();
  }

  /**
   * Asigna o cambia el cliente de una venta abierta.
   */
  asignarCliente(ventaIdTemporal: string, cliente: Cliente): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    venta.setCliente(cliente);

    this.notifyVentasChanged();
  }

  /**
   * Elimina el cliente asociado a una venta abierta.
   */
  quitarCliente(ventaIdTemporal: string): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    venta.clearCliente();

    this.notifyVentasChanged();
  }

  /**
   * Añade una línea real a una venta abierta.
   */
  agregarLinea(ventaIdTemporal: string, linea: VentaLineaEnCurso): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    venta.addLinea(linea);

    this.notifyVentasChanged();
  }

  /**
   * Añade uno o varios artículos a una venta incrementando la cantidad si ya estaban presentes.
   */
  agregarArticulos(ventaIdTemporal: string, articulos: readonly ArticuloVenta[]): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    for (const articulo of articulos) {
      const lineaExistente: VentaLineaEnCurso | undefined = venta.lineas.find(
        (linea: VentaLineaEnCurso): boolean => linea.articuloPublicId === articulo.publicId,
      );

      if (lineaExistente !== undefined) {
        lineaExistente.incrementCantidad();
        continue;
      }

      venta.addLinea(new VentaLineaEnCurso().fromArticulo(articulo));
    }

    this.notifyVentasChanged();

    this.setFocusTarget(ventaIdTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Cambia la cantidad de unidades de una línea.
   */
  cambiarCantidad(ventaIdTemporal: string, lineaIdTemporal: string, cantidad: number): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.setCantidad(cantidad);
    this.notifyVentasChanged();
  }

  /**
   * Activa o desactiva el estado de regalo de una línea.
   */
  alternarRegalo(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.setRegalo(!linea.regalo);
    this.notifyVentasChanged();
  }

  /**
   * Sustituye el importe calculado de una línea por un importe manual.
   */
  establecerImporteManual(
    ventaIdTemporal: string,
    lineaIdTemporal: string,
    importeManualMicros: number,
  ): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.setImporteManualMicros(importeManualMicros);
    this.notifyVentasChanged();
  }

  /**
   * Elimina el importe manual de una línea.
   */
  quitarImporteManual(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.clearImporteManual();
    this.notifyVentasChanged();
  }

  /**
   * Elimina el descuento promocional con el que un artículo entró en la venta.
   */
  quitarDescuentoPromocional(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.clearDescuentoPromocional();
    this.notifyVentasChanged();
  }

  /**
   * Establece el descuento porcentual de una línea en puntos básicos.
   */
  establecerDescuentoPorcentaje(
    ventaIdTemporal: string,
    lineaIdTemporal: string,
    descuentoBps: number,
  ): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.setDescuentoManualBps(descuentoBps);
    this.notifyVentasChanged();
  }

  /**
   * Elimina el descuento porcentual manual y recupera el descuento del cliente.
   */
  quitarDescuentoPorcentajeManual(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.clearDescuentoManual();

    this.notifyVentasChanged();
  }

  /**
   * Establece un importe fijo de descuento sobre una línea.
   */
  establecerDescuentoDirecto(
    ventaIdTemporal: string,
    lineaIdTemporal: string,
    descuentoDirectoMicros: number,
  ): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.setDescuentoDirectoMicros(descuentoDirectoMicros);
    this.notifyVentasChanged();
  }

  /**
   * Elimina el descuento directo de una línea.
   */
  quitarDescuentoDirecto(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const linea: VentaLineaEnCurso = this.requireLinea(ventaIdTemporal, lineaIdTemporal);

    linea.clearDescuentoDirecto();
    this.notifyVentasChanged();
  }

  /**
   * Elimina una línea de una venta y restablece el foco si apuntaba a esa línea.
   */
  eliminarLinea(ventaIdTemporal: string, lineaIdTemporal: string): void {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);

    venta.removeLinea(lineaIdTemporal);
    this.notifyVentasChanged();

    const workspace: VentaWorkspaceState | null = this.getWorkspace(ventaIdTemporal);

    if (
      workspace?.focusTarget.type === 'linea' &&
      workspace.focusTarget.lineaIdTemporal === lineaIdTemporal
    ) {
      this.setFocusTarget(ventaIdTemporal, {
        type: 'localizador',
      });
    }
  }

  /**
   * Actualiza el destino de foco que debe restaurarse para una venta.
   */
  setFocusTarget(ventaIdTemporal: string, focusTarget: VentaFocusTarget): void {
    this.requireVenta(ventaIdTemporal);

    const workspace: VentaWorkspaceState | null = this.getWorkspace(ventaIdTemporal);

    if (workspace === null) {
      throw new Error('La venta indicada no dispone de workspace.');
    }

    const workspaces: Map<string, VentaWorkspaceState> = new Map<string, VentaWorkspaceState>(
      this.workspacesSignal(),
    );

    workspaces.set(ventaIdTemporal, {
      ...workspace,
      focusTarget,
    });

    this.workspacesSignal.set(workspaces);
  }

  /**
   * Guarda la posición del panel flotante del total para una venta.
   */
  setTotalPosition(ventaIdTemporal: string, x: number, y: number): void {
    this.requireVenta(ventaIdTemporal);

    const workspace: VentaWorkspaceState | null = this.getWorkspace(ventaIdTemporal);

    if (workspace === null) {
      throw new Error('La venta indicada no dispone de workspace.');
    }

    const workspaces: Map<string, VentaWorkspaceState> = new Map<string, VentaWorkspaceState>(
      this.workspacesSignal(),
    );

    workspaces.set(ventaIdTemporal, {
      ...workspace,
      totalPosition: {
        x,
        y,
      },
    });

    this.workspacesSignal.set(workspaces);
  }

  /**
   * Busca una venta abierta mediante su identificador temporal.
   */
  findById(ventaIdTemporal: string): VentaEnCurso | null {
    return (
      this.ventas().find((venta: VentaEnCurso): boolean => venta.idTemporal === ventaIdTemporal) ??
      null
    );
  }

  /**
   * Obtiene el workspace asociado a una venta abierta.
   */
  getWorkspace(ventaIdTemporal: string): VentaWorkspaceState | null {
    return this.workspacesSignal().get(ventaIdTemporal) ?? null;
  }

  /**
   * Elimina explícitamente todas las ventas y el estado temporal de trabajo.
   */
  clear(): void {
    this.ventasSignal.set([]);
    this.ventaActivaIdSignal.set(null);
    this.workspacesSignal.set(new Map<string, VentaWorkspaceState>());
    this.nextVentaNumber = 1;
  }

  /**
   * Obtiene una venta abierta o detiene la operación si no existe.
   */
  private requireVenta(ventaIdTemporal: string): VentaEnCurso {
    const venta: VentaEnCurso | null = this.findById(ventaIdTemporal);

    if (venta === null) {
      throw new Error('La venta indicada no está abierta.');
    }

    return venta;
  }

  /**
   * Obtiene una línea perteneciente a una venta abierta o detiene la operación si no existe.
   */
  private requireLinea(ventaIdTemporal: string, lineaIdTemporal: string): VentaLineaEnCurso {
    const venta: VentaEnCurso = this.requireVenta(ventaIdTemporal);
    const linea: VentaLineaEnCurso | undefined = venta.lineas.find(
      (item: VentaLineaEnCurso): boolean => item.idTemporal === lineaIdTemporal,
    );

    if (linea === undefined) {
      throw new Error('La línea indicada no pertenece a la venta.');
    }

    return linea;
  }

  /**
   * Notifica a los consumidores de los signals que una venta ha cambiado internamente.
   */
  private notifyVentasChanged(): void {
    this.ventasSignal.update((ventas: readonly VentaEnCurso[]): readonly VentaEnCurso[] => [
      ...ventas,
    ]);
  }
}
