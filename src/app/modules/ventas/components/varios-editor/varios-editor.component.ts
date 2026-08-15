import {
  afterNextRender,
  Component,
  ElementRef,
  input,
  OnInit,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type VentaVariosData from '@model/ventas/venta-varios-data.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import { eurosToMicros, microsToEuros } from '@utils/money.utils';

@Component({
  selector: 'otpv-varios-editor',
  templateUrl: './varios-editor.component.html',
  styleUrl: './varios-editor.component.scss',
  imports: [BpsToPercentPipe, MatButton, MatFormFieldModule, MatInput],
})
export default class VariosEditorComponent implements OnInit {
  readonly initialData: InputSignal<VentaVariosData> = input.required<VentaVariosData>();

  readonly ivaOptionsBps: InputSignal<readonly number[]> = input.required<readonly number[]>();

  readonly title: InputSignal<string> = input<string>('Introducir Varios');

  readonly saveEvent: OutputEmitterRef<VentaVariosData> = output<VentaVariosData>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly descripcion: WritableSignal<string> = signal<string>('');

  readonly pvpEuros: WritableSignal<number | null> = signal<number | null>(0);

  readonly ivaBps: WritableSignal<number> = signal<number>(0);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  private readonly descripcionInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('descripcionInput');

  private readonly pvpInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('pvpInput');

  constructor() {
    afterNextRender((): void => {
      const inputElement: HTMLInputElement = this.pvpInput().nativeElement;

      inputElement.focus();
      inputElement.select();
    });
  }

  ngOnInit(): void {
    const initialData: VentaVariosData = this.initialData();

    this.descripcion.set(initialData.descripcion);

    this.pvpEuros.set(microsToEuros(initialData.pvpMicros));

    this.ivaBps.set(initialData.ivaBps);
  }

  updateDescripcion(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.descripcion.set(inputElement.value);
  }

  updatePvp(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.pvpEuros.set(Number.isNaN(inputElement.valueAsNumber) ? null : inputElement.valueAsNumber);
  }

  updateIva(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;

    const ivaBps: number = Number(selectElement.value);

    if (Number.isSafeInteger(ivaBps)) {
      this.ivaBps.set(ivaBps);
    }
  }

  save(event: Event): void {
    event.preventDefault();

    this.error.set(null);

    const descripcion: string = this.descripcion().trim();

    if (descripcion.length === 0 || descripcion.length > 200) {
      this.error.set('El nombre debe contener entre 1 y 200 caracteres.');

      this.descripcionInput().nativeElement.focus();

      return;
    }

    const pvpEuros: number | null = this.pvpEuros();

    if (pvpEuros === null || !Number.isFinite(pvpEuros) || pvpEuros < 0) {
      this.error.set('El PVP debe ser mayor o igual que cero.');

      this.pvpInput().nativeElement.focus();

      return;
    }

    const ivaBps: number = this.ivaBps();

    if (!this.ivaOptionsBps().includes(ivaBps)) {
      this.error.set('Debes seleccionar un tipo de IVA válido.');

      return;
    }

    let pvpMicros: number;

    try {
      pvpMicros = eurosToMicros(pvpEuros);
    } catch {
      this.error.set('El PVP indicado es demasiado grande.');

      this.pvpInput().nativeElement.focus();

      return;
    }

    this.saveEvent.emit({
      descripcion,
      pvpMicros,
      ivaBps,
    });
  }

  cancel(): void {
    this.cancelEvent.emit();
  }
}
