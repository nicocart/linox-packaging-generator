import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, normalizeInput, createDieline} from '../src/geometry.js';
import {createFlatSvg,createViewsSvg,createIsoSvg} from '../src/artwork.js';

// Embedded base64 images/fonts may contain "NaN" by chance; check markup only.
const markup=svg=>svg.replace(/data:[^"')]+/g,'');

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
  assert.doesNotMatch(markup(svg),/NaN/);
});
test('front, back and side views are generated for SI15C',()=>{
  const svg=createViewsSvg(PRESETS.SI15C);
  for(const s of ['83 mm','23 mm','16 mm']) assert(svg.includes(s));
});
test('invalid sizing is rejected',()=>{
  assert.throws(()=>createDieline({model:'TEST',category:'rod',length:0,width:23,depth:16}));
  assert.throws(()=>createDieline({model:'TEST',category:'nope',length:83,width:23,depth:16}));
});
test('presentation board renders every preset without invalid numbers',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  for(const item of Object.values(PRESETS)){
    const svg=createPresentationSvg(item);
    assert.doesNotMatch(markup(svg),/NaN|undefined/);
    assert(svg.includes(item.model));
    for(const d of [item.length,item.width,item.depth]) assert(svg.includes(`${d} mm`));
  }
});
test('dieline flaps and glue tab are closed cut outlines',()=>{
  const d=createDieline(PRESETS.SI15C);
  assert.equal(d.creasePaths.length,12);
  for(const path of d.cutPaths) assert.match(path,/^M[-\d.,]+(L|Q)/);
});
test('every export embeds the category artwork and official wordmark',()=>{
  for(const item of Object.values(PRESETS)){
    for(const make of [createFlatSvg,createViewsSvg,createIsoSvg]){
      const svg=make(item);
      assert.doesNotMatch(markup(svg),/NaN|undefined/);
      assert.match(svg,/id="pic-\w+"[^>]*><image href="data:image\/png;base64,/);
      assert.match(svg,/id="back-panel"/);
      assert.match(svg,/fill="#e60012"/);
    }
  }
});

test('responsive carton layout switches at the correct aspect ratios',async()=>{
  const {getLayoutProfile}=await import('../src/artwork.js');
  assert.equal(getLayoutProfile(83,23),'wide');
  assert.equal(getLayoutProfile(32,32),'square');
  assert.equal(getLayoutProfile(46,46),'square');
  assert.equal(getLayoutProfile(43,26),'landscape');
  assert.equal(getLayoutProfile(24,14),'compact');
});
test('wide SI15C uses expanded design on front and back consistently',()=>{
  const flat=createFlatSvg(PRESETS.SI15C);
  const faces=createViewsSvg(PRESETS.SI15C);
  for(const svg of [flat,faces]){
    assert.match(svg,/data-layout="wide"/);
    assert.match(svg,/data-layout="wide-back"/);
    assert.match(svg,/href="#pic-rod"/);
    assert.doesNotMatch(markup(svg),/NaN|undefined/);
  }
});
test('square packages retain existing art templates',()=>{
  for(const preset of [PRESETS.GE17C,PRESETS['S6004-2RS']]){
    const flat=createFlatSvg(preset);
    assert.match(flat,/data-layout="square"/);
    assert.match(flat,/href="#back-panel"/);
  }
});

test('long carton keeps bold front and uses the original compact badge',()=>{
  const art=createFlatSvg(PRESETS.SI15C);
  const front=art.split('data-layout="wide"')[1]?.split('</svg>')[0];
  const back=art.split('data-layout="wide-back"')[1]?.split('</svg>')[0];
  assert.ok(front && back);
  assert.match(front,/font-weight="900"/);
  assert.match(front,/data-layer="diagonal-branding"/);
  assert.doesNotMatch(front,/stroke="#1a1a1a" stroke-width="/);
  assert.match(back,/href="#back-panel"/);
  assert.match(back,/data-brand-badge="compact"/);
  assert.match(back,/data-layer="diagonal-branding"/);
  assert.doesNotMatch(back,/CORROSION-RESISTANT/);
  const bw=Number(back.match(/data-badge-width="([0-9.]+)"/)?.[1]);
  const bh=Number(back.match(/data-badge-height="([0-9.]+)"/)?.[1]);
  assert.ok(bw>0 && bw/PRESETS.SI15C.length<.45);
  assert.ok(bh>0 && bh/PRESETS.SI15C.width<=.82);
  assert.match(art,/®/);
  assert.doesNotMatch(markup(art),/NaN|undefined/);
});
test('decoration and open-box printing are present in presentation exports',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  for(const config of [PRESETS.SI15C,PRESETS.GE17C,PRESETS['S6004-2RS']]){
    const out=createPresentationSvg(config);
    assert.match(out,/data-layer="diagonal-branding"/);
    assert.match(out,/data-open-box-print="true"/);
    assert.match(out,/href="#back-panel"/);
    assert.doesNotMatch(markup(out),/NaN|undefined/);
  }
});
test('square back labels still use their fixed original graphic',()=>{
  for(const item of [PRESETS.GE17C,PRESETS['S6004-2RS']]){
    const art=createFlatSvg(item);
    assert.match(art,/href="#back-panel"/);
    assert.doesNotMatch(art,/data-layout="wide-back"/);
  }
});
