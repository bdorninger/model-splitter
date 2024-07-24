import { immData } from './imm-data';
import {
  FilterOperator,
  mergePickedObjects,
  select,
  selectOrRemove,
} from './merge-util';
import { pcellData } from './pcell-data';
import { ensureDescendantsHierarchy2, split, traversePath } from './split-util';
import {isEqual} from 'lodash';
import './style.css';

const ta: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#JS');
const ta2: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#SEL');

let cloned = structuredClone(pcellData);

mergePickedObjects(cloned, immData as any, {
  property: 'id',
  skipRemainder: false,
  contributerPropertyName: 'serverId',
  contributor: 'IMM',
  onError: (e: unknown) => console.error(e),
});

const merged = cloned ; // structuredClone(cloned);

if (ta != null) {
  ta.value = JSON.stringify(merged, undefined, 2);
}

const target = split(merged,{
  property: 'serverId',
  value: 'IMM',
  operator: FilterOperator.sEQ
})

// target = ensureDescendantsHierarchy2(merged, target, { value: `$['content'][0]['header'][2]`, property: 'id'})

console.log(`TRG`, JSON.stringify(target, undefined,2));

if (ta2 != null) {
  ta2.value = `split for IMM:\n\n`.concat(JSON.stringify(target, undefined, 2));
}

console.log('EQ ',isEqual(target,immData));