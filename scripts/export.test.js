import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import test from 'node:test';
import {locales} from '../src/dictionary/runtime.ts';

test('each exported route supplies only its own used messages', async()=>{
  const dir='out/_next/static/chunks';
  const files=await readdir(dir,{recursive:true});
  const scripts=await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>readFile(dir+'/'+f,'utf8')));
  for(const locale of locales){
    const html=await readFile('out/'+locale+'/index.html','utf8');
    assert.ok(html.includes('<html lang="'+locale+'">'));
    const flight=await readFile('out/'+locale+'/index.txt','utf8');
    const line=flight.split('\n').find(l=>l.includes('"translations":{"vending-bench-game"'));
    assert.ok(line,'Missing client translations for '+locale);
    const record=JSON.parse(line.slice(line.indexOf(':')+1));
    const dictionary=record[3].translations['vending-bench-game'];
    assert.deepEqual(Object.keys(dictionary),[locale]);
    const messages=dictionary[locale];
    assert.ok(messages.VBBOOT03,'Boot hint missing');
    assert.ok(!('VFADD001' in messages),'Unused order-form message shipped');
    assert.ok(!scripts.some(s=>s.includes(messages.VBBOOT03)),'Translation included in shared browser JS');
  }
});
