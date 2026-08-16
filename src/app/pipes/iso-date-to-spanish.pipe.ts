import { Pipe, type PipeTransform } from '@angular/core';
import { formatIsoDateToSpanishDate } from '@utils/date.utils';

@Pipe({
  name: 'isoDateToSpanish',
})
export default class IsoDateToSpanishPipe implements PipeTransform {
  transform(value: string): string {
    return formatIsoDateToSpanishDate(value);
  }
}
