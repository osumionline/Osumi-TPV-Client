import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'otpv-sales',
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SalesComponent {}
