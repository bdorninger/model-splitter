import { immData } from './imm-data';
import {
  FilterOperator,
  mergePickedObjects,
  select,
  selectOrRemove,
} from './merge-util';
import { pcellData } from './pcell-data';
import { traversePath } from './split-util';
import './style.css';

const ta: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#JS');
const tsel: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#SEL');

let cloned = structuredClone(pcellData);

mergePickedObjects(cloned, immData as any, {
  property: 'id',
  skipRemainder: false,
  contributerPropertyName: 'serverId',
  contributor: 'IMM',
  onError: (e: unknown) => console.error(e),
});

if (ta != null) {
  ta.value = JSON.stringify(cloned, undefined, 2);
}

const sel = selectOrRemove(
  cloned,
  {
    operator: FilterOperator.sEQ,
    property: 'serverId',
    value: 'IMM',
  },
  'select'
);

if (tsel != null) {
  tsel.value = JSON.stringify(sel, undefined, 2);
}

sel.forEach((ssel) => {
  if (ssel.path != null) {
    console.log(`Process ${ssel.path}`);
    const res = traversePath(cloned, ssel.path);
    console.log(`Done: ${res}`);
  }
});
