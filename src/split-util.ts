
import { FilterOperator, FilterOptions, MergeObject, doCompare, remove, select, selectOrRemove } from './merge-util';

/*
 * TODO: 
 * retain ignored simple properties from low-prio devices being (dominant dev had same prop, value is kept)
 * strip props provided by other devices (saving dominant part, merged has also prop from another dev)
 */

/**
 * Splits a part off a specified model applying the specifired options.
 * Objects will beselected by testing each object for the presence of the specified property 
 * matching the specified value using the specified operator.
 * 
 * This function reconstructs/preserves the selected object's ancestor hierarchy. 
 * If this is unwanted, simply use the functions select/remove from merge utils.
 * 
 * Matched objects are copied in every aspect (i.e. each own property is copied). For objects along the anceostor hierarchy,
 *  properties specified in "copyProperties" will be copied. If that option is not specified, only an empty object is constructed
 * 
 * @param merged the full (and previously merged) object
 * @param options options, telling how to split the object.
 * @returns the split off part of the specified object
 */
export function split<M extends Record<string,any>>(merged: M, options: FilterOptions & { copyProperties?: string[]}): M {
  const sel = selectOrRemove(
    merged,
    options,
    'select'
  ); 
  
  let target = {} as M;

  /*
  fillRecord(target,merged,{
    copyProperties: options.copyProperties ?? []
  });
  */
  
  // console.log(`Objects found with ${options.property} ${options.operator} ${options.value}`)
  // sel.forEach(s => console.log(s));
  // console.log(`------------`)
  
  sel.forEach((ssel) => {
    if (ssel.path != null) {      
      target = recreateObjectHierarchy(merged, target, { ...options, path: ssel.path})      
    }
  });

  // cleaning out potential leftovers
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
  target: S,
  options: FilterOptions & { path: string, copyProperties?: string[]}): S {

  if(typeof options.value !== 'string') {
    throw new Error('wrong type for options.value. must be a string and a valid json path');
  }  
  
  const elems = jsonPathToSegments(options.path);
  let partialPath ='';  
  let currentTarget = target;
  for (let i = 0; i < elems.length; i++) {
    let seg = elems[i];    
    partialPath = partialPath.concat(seg);    
    const seltrg = select(target, {
      jsonPathExpression: partialPath,
    });
    const selmerged = select(obj, {
      jsonPathExpression: partialPath,
    });
    currentTarget = seltrg.length === 0 ? createProperty(currentTarget, selmerged[0], { ...options, path: seg}):seltrg[0]
    if(partialPath==='$') {
      target = currentTarget as S;
    }   
  }
  return target;
}

function createProperty(obj: Record<string,any>| any[] , selectedInSrc: Record<string,any>| any[], options: FilterOptions<string>  & { path: string, copyProperties?: string[]}) {    
  const propName = jsonPathSegmentToPropertyName(options.path);  
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
  const copyProps = options.copyProperties ?? [];
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
  return created
}

