import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, normalizeInput, createDieline} from '../src/geometry.js';
import {createFlatSvg,createViewsSvg} from '../src/artwork.js';

test('packaging dimensions reflect preset input',()=>{
  for(const item of Object.values(PRESETS)){
    const d=createDieline(item);
    assert.equal(d.panels.front.w,item.length);
    assert.equal(d.panels.front.h,item.width);
    assert.equal(d.panels.sideA.w,item.depth);
    assert(d.cutPaths.length>8 && d.creasePaths.length>8);
  }
});
test('product sizing adds allowance to each overall dimension',()=>{
  const d=normalizeInput({model:'SI15C',category:'rod',mode:'product',length:81,width:21,depth:14,allowance:2});
  assert.deepEqual([d.length,d.width,d.depth],[83,23,16]);
});
test('SVG exports contain cut/fold groups and mm units',()=>{
  const svg=createFlatSvg(PRESETS.GE17C);
  assert.match(svg,/id="cut"/); assert.match(svg,/id="crease"/);
  assert.match(svg,/mm"/); assert.match(svg,/GE17C/);
  assert.doesNotMatch(svg,/NaN/);
});
test('front, back and side views are generated for SI15C',()=>{
  const svg=createViewsSvg(PRESETS.SI15C);
  for(const s of ['83 mm','23 mm','16 mm']) assert(svg.includes(s));
});
test('invalid sizing is rejected',()=>{
  assert.throws(()=>createDieline({model:'TEST',category:'rod',length:0,width:23,depth:16}));
  assert.throws(()=>createDieline({model:'TEST',category:'nope',length:83,width:23,depth:16}));
});
