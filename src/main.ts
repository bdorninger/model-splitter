import { immData } from './imm-data';
import {
  FilterOperator,
  mergePickedObjects,
  select,
  selectOrRemove,
} from './merge-util';
import { pcellData } from './pcell-data';
import { ensureDescendantsHierarchy2, traversePath } from './split-util';
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

const sel = selectOrRemove(
  merged,
  {
    operator: FilterOperator.sEQ,
    property: 'serverId',
    value: 'IMM',
  },
  'select'
);

/*
if (ta2 != null) {
  ta2.value = JSON.stringify(sel, undefined, 2);
}*/


let target = {};

// for each path seg, create the proper object
// $ --> root {}
// [content][<num>] --> array with index
// [foo][bar] --> object with property "foo" holding object with property "bar", which holds our object

sel.forEach((ssel) => {
  if (ssel.path != null) {
    console.log(`Process. ${ssel.path}`);
    // debugger;
    // const res = traversePath(cloned, ssel.path);
    target = ensureDescendantsHierarchy2(merged, target, { value: ssel.path!, property: 'id', aspect:'foo'})
    console.log(`Done: `); // ${res}
  }
});

// target = ensureDescendantsHierarchy2(merged, target, { value: `$['content'][0]['header'][2]`, property: 'id', aspect:'foo'})

console.log(`TRG`, JSON.stringify(target, undefined,2));

if (ta2 != null) {
  ta2.value = JSON.stringify(target, undefined, 2);
}

console.log('EQ ',isEqual(target,immData));