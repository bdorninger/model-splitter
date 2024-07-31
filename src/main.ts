import { immData } from './imm-data';
import {
  FilterOperator,
  markObject,
  mergePickedObjects
} from './merge-util';
import { pcellData } from './pcell-data';
import { split } from './split-util';

import './style.css';
// import { doTestSetup } from './test/setup';

/*(function bootstrap () {
  doTestSetup()    
}());*/

function trav(obj: any, p: string): boolean {
  let hasProp = false;
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (Object.hasOwn(obj, p)) {
      console.warn(`obj has prop '${p}'`,obj, obj[p]);
      hasProp = true;
    }
    for (let prop in obj) {
      hasProp = hasProp || trav(obj[prop], p);
    }
  } else if (Array.isArray(obj)) {
    hasProp = hasProp || obj.map((elem) => trav(elem, p)).some(p => p ===true);
  }
  return hasProp;
}

const markerProp = '$contributedFrom';

const ta: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#JS');
const ta2: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#SEL');

let clonedpcell = structuredClone(pcellData);
clonedpcell.serverId = 'PCELL'; // the view model service inserts a top level serverID into the "dominant" model
markObject(clonedpcell,{ property: markerProp, value: 'PCELL', doNotFollow: ['inputs']})
let clonedimm = structuredClone(immData);
markObject(clonedimm,{ property: markerProp, value: 'IMM', doNotFollow: ['inputs']})

console.log(JSON.stringify(clonedimm));
console.log(JSON.stringify(clonedpcell));

mergePickedObjects(clonedpcell, clonedimm as any, {
  property: 'id',
  skipRemainder: false,
  contributerPropertyName: 'serverId',
  contributor: 'IMM',
  onError: (e: unknown) => console.error(e),
});

const merged = clonedpcell ; // structuredClone(cloned);

if (ta != null) {
  ta.value = JSON.stringify(merged, undefined, 2);
}

const splitDevice='PCELL';
const target = split(merged,{
  property: markerProp,
  value: splitDevice,
  operator: FilterOperator.sEQ,
  copyProperties:  ['id', 'viewId', 'nameKey', 'imageKey', 'position','inputs', 'viewModelId']
})

// target = ensureDescendantsHierarchy2(merged, target, { value: `$['content'][0]['header'][2]`, property: 'id'})
markObject(target,{
  property: markerProp,
  eraseMark:true
})
markObject(target,{
  property:'serverId',
  eraseMark:true
})
// console.log(`TRG`, JSON.stringify(target, undefined,2));

if (ta2 != null) {
  ta2.value = `split for ${splitDevice}:\n\n`.concat(JSON.stringify(target, undefined, 2));
}

trav(target, markerProp)

