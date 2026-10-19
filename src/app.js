import { CATEGORY, PRESETS, normalizeInput, assessLayout } from './geometry.js';
import { createFlatSvg } from './artwork.js';
import { createPresentationSvg } from './presentation.js';
import { loadFontDataFor } from './fonts.js';

const $=id=>document.getElementById(id);
const form=$('params');
const fields=['model','category','length','width','depth','allowance'];
let pending=null;

function currentRaw() {
  return Object.fromEntries([...fields.map(x=>[x,form.elements.namedItem(x).value]),['mode',form.elements.namedItem('mode').value]]);
}
function setRaw(raw) {
  const input={...PRESETS.SI15C,...raw};
  for(const f of fields) if(input[f]!==undefined) form.elements.namedItem(f).value=input[f];
  for(const radio of form.elements.namedItem('mode')) radio.checked=radio.value===(input.mode||'box');
  updateSizing();render();
}
function updateSizing() {
  const mode=form.elements.namedItem('mode').value;
  $('allowance-wrap').hidden=mode!=='product';
  $('formula-help').textContent=mode==='product'?'每个方向加的是合计余量，例如 81 × 21 × 14 加 2 mm 得到 83 × 23 × 16。':'输入纸盒名义外尺寸。展开图将以毫米计算。';
}
function render() {
  try {
    const raw=currentRaw(), conf=normalizeInput(raw);
    // Live preview loads fonts by URL; downloads embed them (see exportWith).
    const output=createPresentationSvg(raw,{embedFonts:false});
    $('drawing').innerHTML=output;
    $('summary-model').textContent=conf.model;
    $('summary-category').textContent=CATEGORY[conf.category].description;
    $('summary-dims').textContent=[conf.length,conf.width,conf.depth].join(' × ');
    $('drawing-caption').textContent='上方正反侧面及开盒效果 · 下方完整刀模展开';
    const messages=assessLayout(raw);
    $('warnings').replaceChildren(...messages.map(msg=>{const li=document.createElement('li');li.textContent=msg;return li;}));
    $('drawing').classList.remove('invalid');
    $('scale-note').textContent='矢量几何 · 名义毫米';
    try { localStorage.setItem('linox-packaging-studio:v1',JSON.stringify(raw)); } catch { /* storage may be disabled */ }
    const current=Object.entries(PRESETS).find(([,p])=>p.model===conf.model&&p.category===conf.category&&p.length===conf.length&&p.width===conf.width&&p.depth===conf.depth);
    document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',current?.[0]===b.dataset.preset));
    pending=null;
  } catch (err) {
    pending=err;
    $('drawing').textContent=err.message;
    $('drawing').classList.add('invalid');
    $('scale-note').textContent='参数校验未通过';
  }
}
function toast(message) {
  const t=$('toast');t.textContent=message;t.classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3200);
}
function download(name,text,mime) {
  const blob=new Blob([text],{type:mime});
  const href=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=href;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function safely(action) {try { if (pending) throw pending; action(currentRaw()); } catch(e) {toast(e.message);} }
/** Downloads and print embed every chosen font, so fetch their files first. */
async function exportWith(action) {
  try {
    if (pending) throw pending;
    const raw=currentRaw(), conf=normalizeInput(raw);
    await loadFontDataFor(conf);
    action(raw);
  } catch(e) { toast(e.message); }
}
function filename(raw,type,ext) {
  const c=normalizeInput(raw);
  return `LINOX_${c.model.replace(/[^a-zA-Z0-9_-]/g,'_')}_${type}_${c.length}x${c.width}x${c.depth}mm.${ext}`;
}

document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>setRaw({...PRESETS[btn.dataset.preset],mode:'box',allowance:2})));
form.addEventListener('input',()=>{updateSizing();render();});
form.addEventListener('change',()=>{updateSizing();render();});
form.addEventListener('submit',e=>e.preventDefault());
$('download-presentation').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'presentation','svg'),createPresentationSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-flat').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'dieline','svg'),createFlatSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-json').addEventListener('click',()=>safely(raw=>download(filename(raw,'config','json'),JSON.stringify({schema:1,...raw},null,2),'application/json;charset=utf-8')));
$('print-pdf').addEventListener('click',()=>exportWith(raw=>{$('print-sheet').innerHTML=createFlatSvg(raw);window.print();}));
$('load-json').addEventListener('click',()=>$('json-file').click());
$('json-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try {const data=JSON.parse(await file.text());normalizeInput(data);setRaw(data);toast('配置已导入');}catch(err){toast('配置无效：'+err.message);}
  e.target.value='';
});
try{const saved=JSON.parse(localStorage.getItem('linox-packaging-studio:v1')||'null');if(saved){normalizeInput(saved);setRaw(saved);}else render();}catch{render();}
