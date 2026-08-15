import { Pipe, type PipeTransform } from '@angular/core';
import { centsToEuros } from '@utils/money.utils';

@Pipe({
  name: 'centsToEuros',
})
export default class CentsToEurosPipe implements PipeTransform {
  transform(cents: number): number {
    return centsToEuros(cents);
  }
}
