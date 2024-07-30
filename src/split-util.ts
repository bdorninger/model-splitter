
import { FilterOperator, FilterOptions, MergeObject, MergeOptions, doCompare, remove, select, selectOrRemove } from './merge-util';
import { ViewConfig } from './types';

/*
 * TODO: 
 * retain ignored simple properties from low-prio devices being (dominant dev had same prop, value is kept)
 * strip props provided by other devices (saving dominant part, merged has also prop from another dev)
 */

/**
 *
 * 
 * @param merged 
 * @param options 
 * @returns 
 */
export function split(merged: ViewConfig, options: FilterOptions): ViewConfig {
  const sel = selectOrRemove(
    merged,
    options,
    'select'
  ); 
  
  let target = {};

  fillRecord(target,merged,{
    copyProperties: ['viewId', 'id', 'viewModelId']
  });
   
  // does it make a difference ? 
  // YES: sorting causes mangling up the structure in the target!
  /*sel.sort(
    (a, b) =>
      (a.path?.split('[').length ?? 0) - (b.path?.split('[').length ?? 0)
  );*/

  console.log(`Objects found with ${options.property} ${options.operator} ${options.value}`)
  sel.forEach(s => console.log(s));
  console.log(`------------`)
  
  sel.forEach((ssel) => {
    if (ssel.path != null) {      
      target = recreateObjectHierarchy(merged, target, { property: 'id',value: ssel.path!, filterOp: options.operator!, filterProperty: options.property!, filterValue: options.value!})      
    }
  });


  //
  remove(target,{
    property:options.property,
    value: options.value,
    operator: FilterOperator.sNEQ
    
  })

  return target;
}

// Recreates the contributor specific hierarchy and copies selected content
function recreateObjectHierarchy<S extends MergeObject>(
  obj: S,
  trg: S,
  options: Required<
    Pick<
      MergeOptions, // only string allowed for paths!!
      'property' | 'value'
    > & { filterProperty: string, filterOp: FilterOperator, filterValue: string}
  >
): S {

  if(typeof options.value !== 'string') {
    throw new Error('wrong type for options.value. must be a string and a valid json path');
  }  
  const elems = jsonPathToSegments(options.value);
  let p2 ='';  
  let lastValidSel = null;
  for (let i = 0; i < elems.length; i++) {
    let seg = elems[i];    
    p2 = p2.concat(seg);    
    const seltrg = select(trg, {
      jsonPathExpression: p2,
    });
    const selmerged = select(obj, {
      jsonPathExpression: p2,
    });
    if(seltrg.length === 0) {      
      lastValidSel = createProperty(lastValidSel, seg, selmerged[0], { operator: options.filterOp, property: options.filterProperty, value: options.filterValue});      
    } else {      
      lastValidSel = seltrg[0];      
    }
    
  }
  return trg;
}

function createProperty(obj: Record<string,any>| any[], jsonPathSegment:string, selectedInSrc: Record<string,any>| any[], options: FilterOptions<string>) {
  if(jsonPathSegment==='$') {        
    return obj;
  }
  
  const propName = jsonPathSegmentToPropertyName(jsonPathSegment);
  
  let created = undefined;
  if(Array.isArray(selectedInSrc)) {
    created=[];
  } else if(typeof selectedInSrc === 'object') {
    created= fillRecord({},selectedInSrc, options);
  }

  if(created!=null && Array.isArray(obj)) {
    obj.push(created);
  } else if(created!=null && !Array.isArray(obj) && typeof obj === 'object') {
    obj[propName] = created;
  }
  return created
}

function jsonPathToSegments(fullPath: string): string[] {
  return fullPath.split(/(?=\[)/g);   
}

function jsonPathSegmentToPropertyName(segment: string): string {
  let propName = segment;
  propName = propName.replace('[','');
  propName = propName.replace(']','');
  propName= propName.replaceAll(`'`,'');
  return propName;
}

function fillRecord(created:Record<string,any>, original: Record<string,any>, options: FilterOptions<string> & { copyProperties?: string[]}): Record<string,any> {
  // if the original object has the property with the desired value (e.g. serverId==="IMM")
  // then we clone the tree from the original
  // TODO: this subtree in turn might have objects form other servers in it. we need to strip that as well
  const copyProps = options.copyProperties==null ? ['id', 'viewId', 'nameKey', 'imageKey', 'position','inputs'] : options.copyProperties;
  const clonedOrig = structuredClone(original);
  // console.log('FILL: ',created, clonedOrig, options)  
  if(options.property!=null && doCompare(original[options.property],options.operator ?? FilterOperator.sEQ, `${options.value}`)) {    
    created =  {
      ...clonedOrig  
    }    
  } else if(copyProps.length>0) {
    copyProps.forEach(pname => {
      if(Object.hasOwn(clonedOrig, pname)) {
        created[pname] = clonedOrig[pname]
      }
    })
  }

  // TODO: more properties, use whitlist/blacklist

  return created
}

