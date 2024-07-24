describe('mytests', ()=> {
    it(`can split`,()=>{
        expect(1).toEqual(1);
    });
    it('fails always', ()=> {
        const k = undefined
        expect(k).toBeDefined();
    })
  }
)