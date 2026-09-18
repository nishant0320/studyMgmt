import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const output = await build({entryPoints:['src/utils/categories.ts'], bundle:true, write:false, format:'esm', platform:'node'});
const {availableCategories,defaultCategories,categoryCatalog} = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const empty = () => ({tasks:[],events:[],sessions:[],customCategories:[]});
test('category catalog includes built-ins and names from every study source', () => {
 const state = {customCategories:['Physics'],tasks:[{category:'Calculus'}],events:[{category:'Exam prep'}],sessions:[{category:'Botany'}]};
 const result = availableCategories(state);
 for(const category of [...defaultCategories,'Physics','Calculus','Exam prep','Botany']) assert(result.includes(category));
 assert.equal(result[0],'General');
});
test('category catalog trims and deduplicates case-insensitively without changing saved records', () => {
 const state = {...empty(),customCategories:[' Physics ', 'physics', '','  '],tasks:[{category:'PHYSICS'},{category:'General'}]};
 const before = JSON.stringify(state); const result = availableCategories(state);
 assert.equal(result.filter(x=>x.toLowerCase()==='physics').length,1); assert(result.includes('Physics'));
 assert(!result.includes('')); assert.equal(JSON.stringify(state),before);
});
test('category catalog preserves the current editor spelling and retains orphaned timer selections', () => {
 const state = {...empty(),customCategories:['Physics']};
 const result = availableCategories(state,'PHYSICS');
 assert(result.includes('PHYSICS'));assert(!result.includes('Physics'));
 assert(availableCategories(empty(),'Retired topic').includes('Retired topic'));
 assert.deepEqual(availableCategories({tasks:[],events:[],sessions:[]}),availableCategories(empty()));
});

test('settings catalog includes every source and counts usage without duplicating custom aliases', () => {
 const state = {customCategories:['Physics',' physics '],tasks:[{category:'PHYSICS'},{category:'Physics'}],events:[{category:'Exam prep'}],sessions:[{category:'Botany'}]};
 const catalog = categoryCatalog(state);
 assert.deepEqual(catalog.find(c=>c.name==='Physics'),{name:'Physics',custom:true,builtIn:false,tasks:2,events:0,sessions:0});
 assert.equal(catalog.find(c=>c.name==='General').builtIn,true);
 assert.equal(catalog.find(c=>c.name==='Exam prep').events,1);
 assert.equal(catalog.find(c=>c.name==='Botany').sessions,1);
 assert.deepEqual(catalog.map(c=>c.name),availableCategories(state));
});
