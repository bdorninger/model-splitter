import { JSONPath } from 'jsonpath-plus';
import { MergeObject, MergeOptions, select } from './merge-util';
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
    cp = cp.concat('/');
  }
  return cp;
}

// path
export function ensureDescendantsHierarchy2<S extends MergeObject>(
  obj: S,
  trg: S,
  options: Required<
    Pick<
      MergeOptions, // only string allowed for paths!!
      'aspect' | 'property' | 'value'
    >
  >
): S {

  if(typeof options.value !== 'string') {
    throw new Error('wrong type for options.value. must be a string and a valid json path');
  }  
  const elems = options.value.split('[');
  let p2 ='';
  let lastvalidElem = -1;
  let lastValidSel = null;
  for (let i = 0; i < elems.length; i++) {
    let seg = elems[i];
    if(seg.endsWith(']')) {
      seg = '['.concat(seg);
    }
    p2 = p2.concat(seg);
    // console.log(`select via: ${p2}`);
    const seltrg = select(trg, {
      jsonPathExpression: p2,
    });
    const selmerged = select(obj, {
      jsonPathExpression: p2,
    });
    if(seltrg.length === 0) {
      console.log(`not found anything @: ${lastvalidElem}`,p2,seg)
      lastValidSel = createProp(lastValidSel, seg, selmerged[0]);
      
    } else {
      // 
      lastValidSel = seltrg[0];
      lastvalidElem = i
    }
    
  }
  return trg;
}

function createProp(obj: Record<string,any>| any[], propName:string, selectedInSrc: Record<string,any>| any[]) {
  if(propName==='$') {
    return obj;
  }
  
  propName = propName.replace('[','');
  propName = propName.replace(']','');
  propName= propName.replaceAll(`'`,'');
  
  let created = undefined;
  if(Array.isArray(selectedInSrc)) {
    created=[];
  } else if(typeof selectedInSrc === 'object') {
    created= fill({},selectedInSrc);
  }

  if(created!=null && Array.isArray(obj)) {
    obj.push(created);
  } else if(created!=null && !Array.isArray(obj) && typeof obj === 'object') {
    obj[propName] = created;
  }
  return created
}

function fill(created:Record<string,any>, original: Record<string,any>): Record<string,any> {
  // here we should allow to spec the contributor/filter prop!
  if(original.serverId==='IMM') {
    const clonedOrig = structuredClone(original);
    created =  {
      ...clonedOrig  
    }
    delete created.serverId;
  } else if(original.id !=null) {
    created.id = original.id
  }

  return created
}

