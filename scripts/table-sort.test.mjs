import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const window = {};
vm.runInNewContext(await fs.readFile(new URL('../content/llm-table-sort.js', import.meta.url),'utf8'), {window});
const {numeric,compare,sort}=window.LLMTableSort;
test('numeric order handles money, percentages, separators, context and time units',()=>{
  assert.equal(numeric('$1,364.50'),1364.5); assert.equal(numeric('62%'),62);
  assert.equal(numeric('1.05M'),1050000); assert.equal(numeric('1,048,576'),1048576);
  assert.equal(numeric('200K'),200000); assert.equal(numeric('1.6T / 49B active'),1.6e12);
  assert.equal(numeric('1.5h','time'),90); assert.equal(numeric('30s','time'),.5);
  assert.equal(numeric('≈1.92TB','memory'),1920); assert.equal(numeric('2026-10-27','date'),20261027);
  assert(compare('$10.00','$2.00',true)>0); assert(compare('1.05M','900K',false)<0);
});
test('missing data is last both ways; null/blank is not zero',()=>{
  for(const value of [null,undefined,'','—','N/A','미측정']) {
    assert.equal(numeric(value),null); assert(compare(value,0,true)>0); assert(compare(value,0,false)>0);
  }
  assert.equal(numeric(0),0); assert.equal(numeric('$0.00'),0);
  assert.equal(compare(null,'—',false),0); assert(compare('모델 2','모델 10',true,'text')<0);
});
test('row sorting preserves objects, hidden/color state, raw precision, ties and aria-sort',()=>{
  const rows=[{id:'a',value:.101,hidden:true,color:'gray'},{id:'b',value:.104},{id:'c',value:null},{id:'d',value:.101}];
  const body={rows:[...rows],append(row){this.rows.splice(this.rows.indexOf(row),1);this.rows.push(row);}};
  const cells=[0,1].map(()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}}));
  const table={tBodies:[body],tHead:{rows:[{cells}]}};
  sort(table,0,false,r=>r.value); assert.equal(body.rows.map(r=>r.id).join(','),'b,a,d,c');
  assert.equal(rows[0].hidden,true); assert.equal(rows[0].color,'gray'); assert.equal(cells[0].attributes['aria-sort'],'descending');
  sort(table,1,true,r=>r.value); assert.equal(body.rows.map(r=>r.id).join(','),'a,d,b,c');
  assert.equal(cells[0].attributes['aria-sort'],undefined); assert.equal(cells[1].attributes['aria-sort'],'ascending');
});

test('both pages load the shared sorter and explicitly initialize AA descending',async()=>{
  const content=new URL('../content/',import.meta.url);
  const report=await fs.readFile(new URL('GPT_6_1_Terra_Model_Guide.html',content),'utf8');
  const integrated=await fs.readFile(new URL('주요 LLM 모델.html',content),'utf8');
  const controls=await fs.readFile(new URL('llm-table-controls.js',content),'utf8');
  assert(report.includes('<script src="llm-table-sort.js"></script>'));
  assert(report.includes('sortReportColumn(2,false);'));
  assert(report.includes("help.setAttribute('aria-label',label+' 설명')"));
  assert(integrated.indexOf('src="llm-table-sort.js"')<integrated.indexOf('src="llm-table-controls.js"'));
  assert(controls.includes('sortColumn(28,false);'));
});
