import { immData } from './imm-data';
import {
  FilterOperator,
  markContrib,
  mergePickedObjects
} from './merge-util';
import { pcellData } from './pcell-data';
import { split } from './split-util';

import './style.css';
// import { doTestSetup } from './test/setup';

/*(function bootstrap () {
  doTestSetup()    
}());*/


const ta: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#JS');
const ta2: HTMLTextAreaElement | null =
  document.querySelector<HTMLTextAreaElement>('#SEL');

let clonedpcell = structuredClone(pcellData);
clonedpcell.serverId = 'PCELL'; // the view model service inserts a top level serverID into the "dominant" model
markContrib(clonedpcell,{ property: '$contributors', value: 'PCELL', doNotFollow: ['inputs']})
let clonedimm = structuredClone(immData);
markContrib(clonedimm,{ property: '$contributors', value: 'IMM', doNotFollow: ['inputs']})

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
  property: '$contributors',
  value: splitDevice,
  operator: FilterOperator.sEQ,
  copyProperties:  ['id', 'viewId', 'nameKey', 'imageKey', 'position','inputs', 'viewModelId']
})

// target = ensureDescendantsHierarchy2(merged, target, { value: `$['content'][0]['header'][2]`, property: 'id'})
markContrib(target,{
  property:'$contributors',
  eraseMeta:true
})
markContrib(target,{
  property:'serverId',
  eraseMeta:true
})
// console.log(`TRG`, JSON.stringify(target, undefined,2));

if (ta2 != null) {
  ta2.value = `split for ${splitDevice}:\n\n`.concat(JSON.stringify(target, undefined, 2));
}

