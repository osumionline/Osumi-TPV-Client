import type { Signal, WritableSignal } from '@angular/core';
import { Injectable, signal } from '@angular/core';
import type {
  ComunidadAutonomaInterface,
  ProvinciaInterface,
} from '@model/provincias/provincia.interface';
import PROVINCIAS_AGRUPADAS from '@model/provincias/provincias.constant';

@Injectable({
  providedIn: 'root',
})
export default class ProvinciasService {
  private readonly provinciasAgrupadasSignal: WritableSignal<
    readonly ComunidadAutonomaInterface[]
  > = signal<readonly ComunidadAutonomaInterface[]>([]);

  private readonly provinciasPlainSignal: WritableSignal<readonly ProvinciaInterface[]> = signal<
    readonly ProvinciaInterface[]
  >([]);

  readonly provinciasAgrupadas: Signal<readonly ComunidadAutonomaInterface[]> =
    this.provinciasAgrupadasSignal.asReadonly();

  readonly provinciasPlain: Signal<readonly ProvinciaInterface[]> =
    this.provinciasPlainSignal.asReadonly();

  load(): Promise<void> {
    if (this.provinciasAgrupadasSignal().length > 0) {
      return Promise.resolve();
    }

    const provinciasPlain: ProvinciaInterface[] = PROVINCIAS_AGRUPADAS.flatMap(
      (comunidad: ComunidadAutonomaInterface): readonly ProvinciaInterface[] => comunidad.provinces,
    );

    provinciasPlain.sort((a: ProvinciaInterface, b: ProvinciaInterface): number =>
      a.name.localeCompare(b.name, 'es'),
    );

    this.provinciasAgrupadasSignal.set(PROVINCIAS_AGRUPADAS);
    this.provinciasPlainSignal.set(provinciasPlain);

    return Promise.resolve();
  }

  findById(id: number): ProvinciaInterface | null {
    return (
      this.provinciasPlain().find(
        (provincia: ProvinciaInterface): boolean => provincia.id === id,
      ) ?? null
    );
  }
}
