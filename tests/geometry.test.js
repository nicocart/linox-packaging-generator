import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, normalizeInput, createDieline} from '../src/geometry.js';
import {createFlatSvg,createViewsSvg,createIsoSvg} from '../src/artwork.js';

// Embedded base64 images/fonts may contain "NaN" by chance; check markup only.
const markup=svg=>svg.replace(/data:[^"')]+/g,'');

// Exports embed the chosen font; in Node, feed the woff2 files from disk.
import {readFileSync} from 'node:fs';
import {FONTS, MODEL_FONT, CATEGORY_FONT, registerFontData, fontAttrs, textWidth, capHeight} from '../src/fonts.js';
for(const [key,{weights}] of Object.entries(FONTS))
  for(const w of Object.values(weights))
    registerFontData(key,w,readFileSync(new URL(`../assets/fonts/${key}-${w}.woff2`,import.meta.url)).toString('base64'));

/** Minimal XML well-formedness check for generated SVG: quoted attributes, balanced tags, escaped text. */
function assertWellFormed(svg,name){
  const stack=[];
  const tag=/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|<([^>]*)>/g;
  let m,last=0;
  while((m=tag.exec(svg))){
    const between=svg.slice(last,m.index);
    assert.doesNotMatch(between,/&(?!(amp|lt|gt|quot|apos|#\d+);)/,`${name}: unescaped & near ${m.index}`);
    last=tag.lastIndex;
    if(m[5]!==undefined) assert.fail(`${name}: malformed tag <${m[5].slice(0,80)}>`);
    if(m[4]) continue;
    if(m[1]){ assert.equal(stack.pop(),m[2],`${name}: unbalanced </${m[2]}>`); }
    else stack.push(m[2]);
  }
  assert.deepEqual(stack,[],`${name}: unclosed tags`);
}

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
test('quantity defaults to 1 and must be a positive integer',()=>{
  assert.equal(normalizeInput(PRESETS.SI15C).quantity,1);
  assert.equal(normalizeInput({...PRESETS.SI15C,quantity:120}).quantity,120);
  assert.throws(()=>normalizeInput({...PRESETS.SI15C,quantity:0}));
  assert.throws(()=>normalizeInput({...PRESETS.SI15C,quantity:1.5}));
  assert.throws(()=>normalizeInput({...PRESETS.SI15C,quantity:1000000}));
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
test('quantity is printed on the presentation and PDF page',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  const svg=createPresentationSvg({...PRESETS.SI15C,quantity:42});
  assert.match(svg,/>数量<\/text>/);
  assert.match(svg,/>42<\/text>/);
  assert.match(svg,/fill="#e60012"/);
});
test('batch index page lists models, dimensions and quantities',async()=>{
  const {createBatchIndexSvgs}=await import('../src/presentation.js');
  const pages=createBatchIndexSvgs([
    {...PRESETS.SI15C,quantity:12},
    {...PRESETS.GE17C,quantity:8},
  ],{embedFonts:false});
  assert.equal(pages.length,1);
  const page=pages[0];
  assert.match(page,/包装清单/);
  assert.match(page,/包装款数/);
  assert.match(page,/总数量/);
  assert.match(page,/SI15C/);
  assert.match(page,/GE17C/);
  assert.match(page,/数量/);
  assert.doesNotMatch(page,/分类/);
  assert.doesNotMatch(markup(page),/NaN|undefined/);
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
  assert.match(front,/data-role="model"/);
  assert.match(front,/data-layer="bearing-watermark"/);
  // The front now carries exactly one short rule under the wordmark.
  assert.match(front,/data-role="front-rule"/);
  assert.equal([...front.matchAll(/stroke="#1a1a1a" stroke-width="/g)].length,1);
  assert.match(back,/href="#back-panel"/);
  assert.match(back,/data-brand-badge="compact"/);
  assert.match(back,/data-layer="bearing-watermark"/);
  assert.doesNotMatch(back,/CORROSION-RESISTANT/);
  const bw=Number(back.match(/data-badge-width="([0-9.]+)"/)?.[1]);
  const bh=Number(back.match(/data-badge-height="([0-9.]+)"/)?.[1]);
  assert.ok(bw>0 && bw/PRESETS.SI15C.length<.45);
  assert.ok(bh>0 && bh/PRESETS.SI15C.width<=.82);
  assert.match(art,/data-role="registered"/);
  assert.doesNotMatch(markup(art),/NaN|undefined/);
});
test('decoration and open-box printing are present in presentation exports',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  for(const config of [PRESETS.SI15C,PRESETS.GE17C,PRESETS['S6004-2RS']]){
    const out=createPresentationSvg(config);
    assert.match(out,/data-layer="bearing-watermark"/);
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


test('all categories share one SI15C-derived front and back layout',()=>{
  for(const item of Object.values(PRESETS)){
    const svg=createFlatSvg(item);
    const names=[...svg.matchAll(/data-template="si15c-master"/g)];
    assert.equal(names.length,2);
    assert.match(svg,new RegExp(fontAttrs(MODEL_FONT,'heavy')));
    assert.match(svg,new RegExp(fontAttrs(CATEGORY_FONT,'medium')));
    assert.equal([...svg.matchAll(/data-layer="bearing-watermark"/g)].length,2);
    assert.match(svg,/data-brand-badge="compact"/);
    assert.doesNotMatch(svg,/data-layer="diagonal-branding"/);
  }
});
test('the application displays one full preview, not alternate view tabs',async()=>{
  const {readFileSync}=await import('node:fs');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(html,/id="drawing"/);
  assert.match(html,/id="batch-rows"/);
  assert.match(html,/id="batch-add"/);
  assert.match(html,/id="batch-catalog"/);
  assert.match(html,/id="batch-export"/);
  assert.match(html,/导出/);
  assert.doesNotMatch(html,/id="batch-export-svg"/);
  assert.doesNotMatch(html,/id="download-presentation"/);
  assert.doesNotMatch(html,/id="download-flat"/);
  assert.doesNotMatch(html,/class="sidebar"/);
  assert.doesNotMatch(html,/data-tab=|class="tabs"/);
  assert.doesNotMatch(app,/activeTab|createIsoSvg|createViewsSvg/);
  assert.match(app,/const output=createPresentationSvg\(raw[,)]/);
});
test('interface copy is Chinese-first, without bilingual micro labels',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const label of ['MODEL / SKU','CATEGORY','PRINT FONT','LIVE PREVIEW','SVG VECTOR PREVIEW','WORKFLOW','BRAND SYSTEM','PRODUCT PARAMETERS','PACKAGING ENGINEERING','LOCAL PROCESSING','Reverse Tuck End','Packaging Studio'])
    assert.ok(!html.includes(label),`UI still contains ${label}`);
  for(const label of ['批量生成','从型号库添加','一次生成多个包装','实时预览','包装全景预览','生产工具','包装清单'])
    assert.ok(html.includes(label),`UI missing ${label}`);
});
test('background watermark is visible and inset on wide faces',()=>{
  const svg=createFlatSvg(PRESETS.SI15C);
  const start=svg.indexOf('data-template="si15c-master"');
  const front=svg.slice(start,svg.indexOf('</svg>',start));
  const rings=[...front.matchAll(/<circle cx="([0-9.]+)"[^>]*r="([0-9.]+)"[^>]*opacity="([0-9.]+)"/g)];
  assert.equal(rings.length,4);
  const cx=Number(rings[0][1]);
  assert.ok(cx/PRESETS.SI15C.length>.6 && cx/PRESETS.SI15C.length<.8,`front watermark x ${cx}`);
  assert.ok(Number(rings[0][3])>=.25,'watermark too faint');
  const backStart=svg.indexOf('data-layout="wide-back"');
  const back=svg.slice(backStart,svg.indexOf('</svg>',backStart));
  const backCx=Number(back.match(/<circle cx="([0-9.]+)"/)[1]);
  assert.ok(backCx/PRESETS.SI15C.length>.2 && backCx/PRESETS.SI15C.length<.4,`back watermark x ${backCx}`);
});
test('print uses the colourful presentation and centers it',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
  assert.match(app,/printBatch[\s\S]*createPresentationSvg/);
  assert.match(app,/createBatchIndexSvgs/);
  assert.match(app,/BATCH_STORAGE_KEY/);
  assert.match(app,/readBatchRows/);
  assert.match(app,/batch-print/);
  assert.match(css,/print-color-adjust:exact/);
  assert.match(css,/#print-sheet\{display:flex!important;align-items:center;justify-content:center/);
  assert.match(css,/#print-sheet\.batch-print \.print-page\{/);
  assert.match(css,/page-break-after:always/);
  // Nested face SVGs must keep their own clipping; a broad overflow rule made
  // watermarks spill across the whole printed page.
  assert.match(css,/#print-sheet svg svg,#drawing svg svg\{overflow:hidden!important\}/);
});

test('every downloadable SVG is well-formed XML for every preset',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  for(const item of Object.values(PRESETS)){
    for(const [name,svg] of [['presentation',createPresentationSvg(item)],['dieline',createFlatSvg(item)],['views',createViewsSvg(item)],['iso',createIsoSvg(item)]])
      assertWellFormed(svg,`${item.model}/${name}`);
  }
});
test('exports embed the fixed brand fonts, never system fonts',async()=>{
  const {createPresentationSvg}=await import('../src/presentation.js');
  const fixed=[MODEL_FONT,CATEGORY_FONT];
  for(const item of Object.values(PRESETS)){
    for(const svg of [createPresentationSvg(item),createFlatSvg(item)]){
      const families=new Set([...markup(svg).matchAll(/font-family="([^"]+)"/g)].map(m=>m[1]));
      assert.deepEqual([...families].sort(),fixed.map(key=>`'LINOX ${FONTS[key].label}',sans-serif`).sort());
      for(const key of fixed)
        for(const w of Object.values(FONTS[key].weights))
          assert.ok(svg.includes(`font-family:'LINOX ${FONTS[key].label}';font-weight:${w};src:url(data:font/woff2;base64,`),`${key} ${w} not embedded`);
      assert.doesNotMatch(markup(svg),/Arial|Helvetica|Segoe/);
    }
  }
});
test('brand typography is fixed regardless of input',()=>{
  const conf=normalizeInput({...PRESETS.SI15C,font:'oswald',modelFont:'roboto',categoryFont:'montserrat'});
  assert.deepEqual([conf.modelFont,conf.categoryFont,conf.font],[MODEL_FONT,CATEGORY_FONT,MODEL_FONT]);
  const svg=createFlatSvg({...PRESETS.SI15C,modelFont:'oswald',categoryFont:'montserrat'});
  assert.match(svg,new RegExp(fontAttrs(MODEL_FONT,'heavy')));
  assert.match(svg,new RegExp(fontAttrs(CATEGORY_FONT,'medium')));
  // Object.prototype keys must not pass as valid category names.
  assert.throws(()=>normalizeInput({...PRESETS.SI15C,category:'constructor'}));
});

/** Front-panel text and drawing boxes, read back from the generated SVG. */
function frontBoxes(cfg){
  const conf=normalizeInput(cfg);
  const svg=createFlatSvg(cfg);
  const start=svg.indexOf('data-template="si15c-master"');
  const front=svg.slice(start,svg.indexOf('</svg>',start));
  const num=(s,k)=>Number(s.match(new RegExp(`${k}="([-0-9.]+)"`))[1]);
  const pic=front.match(/<use href="#pic-[^>]+>/)[0];
  const texts=[...front.matchAll(/<text ([^>]+)>([^<]*)<\/text>/g)].filter(t=>/data-role="(model|category)"/.test(t[1]));
  const roleOf=a=>a.match(/data-role="(\w+)"/)[1];
  const lines=texts.map(([,a,str])=>{
    const role=roleOf(a)==='model'?'heavy':'medium', size=num(a,'font-size'), x=num(a,'x'), y=num(a,'y');
    const font=role==='heavy'?conf.modelFont:conf.categoryFont;
    return {role:roleOf(a),x,y,w:textWidth(str,font,role,size),cap:capHeight(font,role,size),size};
  });
  return {pic:{x:num(pic,'x'),y:num(pic,'y'),w:num(pic,'width'),h:num(pic,'height')},lines};
}
test('front rule sits under the wordmark at half its width',()=>{
  const svg=createFlatSvg(PRESETS.SI15C);
  const start=svg.indexOf('data-template="si15c-master"');
  const front=svg.slice(start,svg.indexOf('</svg>',start));
  const rule=front.match(/<line[^>]*data-role="front-rule"[^>]*>/)?.[0];
  assert.ok(rule,'front rule missing');
  const ruleW=Number(rule.match(/data-rule-width="([0-9.]+)"/)[1]);
  const ruleStroke=Number(rule.match(/stroke-width="([0-9.]+)"/)[1]);
  const scale=Number(front.match(/translate\([^)]*\) scale\(([0-9.]+)\)/)[1]);
  const wordmarkW=305.871*scale;
  assert.ok(Math.abs(ruleW-wordmarkW*.5)<.1,`rule ${ruleW} vs half wordmark ${wordmarkW*.5}`);
  assert.ok(ruleStroke>=.3,`rule stroke only ${ruleStroke} mm`);
  assert.match(rule,/stroke="#1a1a1a"/);
});
test('wide front keeps text margins but a tight product margin',()=>{
  const {pic,lines}=frontBoxes(PRESETS.SI15C);
  const left=Math.min(...lines.map(l=>l.x));
  const right=PRESETS.SI15C.length-(pic.x+pic.w);
  assert.ok(left>=4.5,`left text margin only ${left.toFixed(2)} mm`);
  assert.ok(right>=.3 && right<=2,`product right margin ${right.toFixed(2)} mm`);
});
test('near-square product art fills the bottom-right corner',()=>{
  const {pic}=frontBoxes(PRESETS.GE17C);
  assert.ok(pic.w>=11,`product only ${pic.w.toFixed(2)} mm wide`);
  assert.ok(pic.h>=11,`product only ${pic.h.toFixed(2)} mm tall`);
  assert.ok(pic.x+pic.w>=PRESETS.GE17C.length-2,`product right edge ${(pic.x+pic.w).toFixed(2)} mm`);
  assert.ok(pic.y+pic.h>=PRESETS.GE17C.width-2,`product bottom edge ${(pic.y+pic.h).toFixed(2)} mm`);
});
test('1:1 faces share one proportional type scale',()=>{
  const ge=frontBoxes(PRESETS.GE17C), s6=frontBoxes(PRESETS['S6004-2RS']);
  const model=x=>x.lines.find(l=>l.role==='model');
  const category=x=>x.lines.find(l=>l.role==='category');
  const geModel=model(ge).size/PRESETS.GE17C.length, s6Model=model(s6).size/PRESETS['S6004-2RS'].length;
  const geCat=category(ge).size/PRESETS.GE17C.length, s6Cat=category(s6).size/PRESETS['S6004-2RS'].length;
  assert.ok(Math.abs(geModel-s6Model)<.002,`model scale ${geModel.toFixed(4)} vs ${s6Model.toFixed(4)}`);
  assert.ok(Math.abs(geCat-s6Cat)<.002,`category scale ${geCat.toFixed(4)} vs ${s6Cat.toFixed(4)}`);
  // The long SKU wraps at its hyphen instead of shrinking the shared type scale.
  assert.equal(s6.lines.filter(l=>l.role==='model').length,2);
});
test('front text never overlaps the product drawing',()=>{
  const sizes=[[83,23,16],[32,32,16],[46,46,15],[60,40,20],[40,60,20],[30,30,30]];
  const models=['SI15C','GE17C','S6004-2RS','GEG120ES-2RS'];
  for(const [length,width,depth] of sizes) for(const model of models){
    const cfg={model,category:'radial',length,width,depth};
    const {pic,lines}=frontBoxes(cfg);
    for(const l of lines){
      const overlapX=l.x+l.w>pic.x && l.x<pic.x+pic.w;
      const overlapY=l.y>pic.y && l.y-l.cap<pic.y+pic.h;
      assert.ok(!(overlapX&&overlapY),`${model} ${length}x${width}: ${l.role} overlaps drawing`);
      assert.ok(l.x+l.w<=length+1e-6,`${model} ${length}x${width}: ${l.role} runs off the panel`);
    }
  }
});
test('square fronts keep compact line spacing',()=>{
  for(const [length,width] of [[32,32],[46,46],[40,46]]){
    const {lines}=frontBoxes({...PRESETS.GE17C,length,width,depth:16});
    const model=lines.find(l=>l.role==='model'), subs=lines.filter(l=>l.role==='category');
    // Gap from model baseline to the first category cap line, relative to model cap height.
    const gap=(subs[0].y-subs[0].cap-model.y)/model.cap;
    assert.ok(gap>.3 && gap<.8,`${length}x${width}: model→category gap ${gap.toFixed(2)}× cap`);
    if(subs.length>1) assert.ok((subs[1].y-subs[0].y)/subs[0].size<1.4,'category line pitch too loose');
  }
});

test('® is a vector ring plus R in the print font, large enough to read',()=>{
  const svg=createFlatSvg(PRESETS.SI15C);
  assert.doesNotMatch(markup(svg),/®/,'a typed ® would fall back to a system font');
  const marks=[...svg.matchAll(/<g data-role="registered"><circle [^>]*r="([0-9.]+)"/g)].map(m=>Number(m[1]));
  assert.equal(marks.length,3,'front + two sides');
  // Side panel 16 × 23 mm: the slimmer side logo still needs a legible ®.
  assert.ok(Math.min(...marks)*2>=.75,`smallest ® ${Math.min(...marks)*2} mm`);
});
test('side panel centres logo and model on the same line',()=>{
  for(const item of Object.values(PRESETS)){
    const svg=createFlatSvg(item), d=createDieline(item);
    const side=svg.slice(svg.indexOf('data-role="side"')).split('</g></g>')[0];
    const tf=side.match(/translate\(([-0-9.]+) [-0-9.]+\) scale\(([0-9.]+)\)/);
    const logoX=Number(tf[1]), logoW=305.871*Number(tf[2]);
    const ring=side.match(/<circle cx="([-0-9.]+)"[^>]*r="([0-9.]+)"[^>]*stroke-width="([0-9.]+)"/);
    const regRight=Number(ring[1])+Number(ring[2])/.92;
    const model=Number(side.match(/<text x="([-0-9.]+)"[^>]*data-role="side-model"/)[1]);
    const mid=d.panels.sideA.h/2;
    assert.ok(Math.abs((logoX+regRight)/2-mid)<.05,`${item.model}: logo centre ${(logoX+regRight)/2} vs ${mid}`);
    assert.ok(Math.abs(model-mid)<.01,`${item.model}: model centre ${model} vs ${mid}`);
    const share=logoW/d.panels.sideA.h;
    // Slimmer than the old 72% composition, but still the dominant side element.
    assert.ok(share>.45 && share<.6,`${item.model}: side logo ${(share*100).toFixed(0)}% of panel length`);
  }
});
test('category line is at least half the model cap height',()=>{
  for(const item of Object.values(PRESETS)){
    const {lines}=frontBoxes({...item});
    const model=lines.find(l=>l.role==='model'), sub=lines.find(l=>l.role==='category');
    // Target is 0.6×; on a 32 mm square face "Radial Spherical" is width-limited to ~0.48×.
    assert.ok(sub.cap/model.cap>=.45,`${item.model}: category ${(sub.cap/model.cap).toFixed(2)}× model cap`);
  }
});
