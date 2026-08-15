import { Pipe, type PipeTransform } from '@angular/core';
import { microsToEuros } from '@utils/money.utils';

@Pipe({
  name: 'microsToEuros',
})
export default class MicrosToEurosPipe implements PipeTransform {
  transform(micros: number): number {
    return microsToEuros(micros);
  }
}
