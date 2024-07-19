import { select } from './merge-util';
import { ViewConfig } from './types';

export function traversePath(model: ViewConfig, path: string): string {
  const elems = path.split(']').map((elem) => (elem !== '' ? `${elem}]` : ''));
  // console.log('PATH', path, elems);
  let p2 = '';
  let cp = '';
  for (let i = 0; i < elems.length; i++) {
    p2 = p2.concat(elems[i]);
    // console.log(`select via: ${p2}`);
    const sel = select(model, {
      jsonPathExpression: p2,
    });

    const ssel = sel[0];

    if (ssel?.id != null) {
      // console.log('' + ssel.id);
      cp = cp.concat(ssel.id);
    } else {
      cp = cp.concat(elems[i]);
    }
    cp = cp.concat('.');
  }
  return cp;
}
