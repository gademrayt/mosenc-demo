const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname,'../src/state.js');
test('progress survives a JSON export/import round trip', () => {
  assert.ok(fs.existsSync(file), 'Progress engine has not been implemented');
  const engine = require(file);
  const state = engine.empty(['M01','M02']);
  state.tasks.M01.done = true;
  state.tasks.M01.note = 'Проверил страницу на телефоне';
  assert.deepEqual(engine.validate(JSON.parse(JSON.stringify(state)),['M01','M02']),state);
});
test('import refuses invalid, foreign or unsafe records', () => {
 const e=require(file), ids=['M01','M02'];
 const cases=[null,[],{...e.empty(ids),project:'other'},{...e.empty(ids),version:2},
  {...e.empty(ids),tasks:{M01:{done:'true',note:''}}},
  {...e.empty(ids),tasks:{M01:{done:false,note:'x'.repeat(5001)}}},
  {...e.empty(ids),tasks:{unknown:{done:false,note:''}}},
  JSON.parse('{"project":"mosenc-wordpress-plan","version":1,"tasks":{"__proto__":{"done":true,"note":""}}}')];
 for(const bad of cases)assert.throws(()=>e.validate(bad,ids));
});
test('older exports keep valid progress and initialize new tasks',()=>{
 const e=require(file),s=e.empty(['M01']);s.tasks.M01.done=true;
 assert.deepEqual(e.validate(s,['M01','M02']),{...s,tasks:{M01:{done:true,note:''},M02:{done:false,note:''}}});
});
