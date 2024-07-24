import { immData } from "./imm-data";
import { FilterOperator, mergePickedObjects } from "./merge-util";
import { pcellData } from "./pcell-data";
import { split } from "./split-util";
import { ViewConfig } from "./types";
import { describe, it,expect } from "vitest";

describe('mytests', ()=> {
    it(`can split`,()=>{
    let cloned = structuredClone(pcellData);

    mergePickedObjects(cloned, immData as ViewConfig, {
     property: 'id',
     skipRemainder: false,
     contributerPropertyName: 'serverId',
     contributor: 'IMM',
     onError: (e: unknown) => console.error(e),
});

    const merged = cloned ; // structuredClone(cloned);

    const target = split(merged,{
        property: 'serverId',
        value: 'IMM',
        operator: FilterOperator.sEQ
      })
      
    
    expect(target).toEqual(immData);

    });
    /* it('fails always', ()=> {
        const k = undefined
        expect(k).toBeDefined();
    })*/
  }
)