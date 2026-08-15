import { Pipe, type PipeTransform } from '@angular/core';
import { bpsToPercent } from '@utils/percentage.utils';

@Pipe({
  name: 'bpsToPercent',
})
export default class BpsToPercentPipe implements PipeTransform {
  transform(bps: number): number {
    return bpsToPercent(bps);
  }
}
