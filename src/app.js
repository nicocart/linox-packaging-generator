import { CATEGORY, PRESETS, normalizeInput, assessLayout } from './geometry.js';
import { createFlatSvg } from './artwork.js';
import { createPresentationSvg } from './presentation.js';
import { loadFontDataFor } from './fonts.js';
import { parseBatch } from './batch.js';
import { createZipBlob } from './zip.js';

const $=id=>document.getElementById(id);
const form=$('params');
const fields=['model','category','length','width','depth','allowance'];
let pending=null;
const batch={items:[],errors:[],active:null};

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
function download(name,data,mime) {
  const blob=data instanceof Blob?data:new Blob([data],{type:mime});
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
    await action(raw);
  } catch(e) { toast(e.message); }
}
function filename(raw,type,ext) {
  const c=normalizeInput(raw);
  return `LINOX_${c.model.replace(/[^a-zA-Z0-9_-]/g,'_')}_${type}_${c.length}x${c.width}x${c.depth}mm.${ext}`;
}

function makeElement(tag,className,text){
  const element=document.createElement(tag);
  if(className) element.className=className;
  if(text!==undefined) element.textContent=text;
  return element;
}
function refreshBatch(){
  const rawAllowance=$('batch-allowance').value.trim();
  const allowance=rawAllowance===''?3:Number(rawAllowance);
  const parsed=parseBatch($('batch-input').value,{allowance:Number.isFinite(allowance)?allowance:3});
  batch.items=parsed.items;
  batch.errors=parsed.errors;
  batch.active=null;
  const parts=[];
  if(parsed.items.length) parts.push(`${parsed.items.length} 条可生成`);
  if(parsed.errors.length) parts.push(`${parsed.errors.length} 条错误`);
  $('batch-status').textContent=parts.length?parts.join(' · '):'还没有可用的数据行';
  $('batch-export').disabled=parsed.items.length===0;
  renderBatchList();
}
function renderBatchList(){
  const list=$('batch-list');
  list.replaceChildren();
  if(!batch.items.length&&!batch.errors.length){
    list.append(makeElement('div','batch-empty','按上面的格式粘贴多行数据，或先修改示例。'));
    return;
  }
  batch.items.forEach((item,index)=>{
    const row=makeElement('div',`batch-row${batch.active===index?' active':''}`);
    row.append(makeElement('span','batch-line',String(item.line)));
    const model=makeElement('span','batch-model');
    model.append(makeElement('b',undefined,item.conf.model));
    model.append(makeElement('small',undefined,CATEGORY[item.conf.category].description));
    row.append(model);
    const dims=makeElement('span','batch-dims');
    const source=makeElement('span',undefined,`${item.raw.length} × ${item.raw.width} × ${item.raw.depth} mm`);
    source.append(makeElement('small',undefined,` + ${item.raw.allowance} mm 余量`));
    dims.append(source);
    dims.append(makeElement('span',undefined,`→ ${item.conf.length} × ${item.conf.width} × ${item.conf.depth} mm`));
    row.append(dims);
    row.append(makeElement('span','batch-allow',`余量 ${item.raw.allowance} mm`));
    const preview=makeElement('button','batch-preview','预览');
    preview.type='button';
    preview.addEventListener('click',()=>previewBatchItem(item,index));
    row.append(preview);
    list.append(row);
  });
  batch.errors.forEach(error=>{
    const row=makeElement('div','batch-row error');
    row.append(makeElement('span','batch-line',String(error.line)));
    row.append(makeElement('span','batch-error',error.message));
    list.append(row);
  });
}
function previewBatchItem(item,index){
  batch.active=index;
  setRaw({...item.raw});
  renderBatchList();
  $('preview-card').scrollIntoView({behavior:'smooth',block:'start'});
  toast(`已载入 ${item.conf.model}`);
}
function batchStamp(){
  const date=new Date(),pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
const csvCell=value=>{
  const text=String(value??'');
  return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};
async function exportBatch(){
  refreshBatch();
  if(!batch.items.length){toast('没有可导出的数据行');return;}
  const button=$('batch-export');
  button.disabled=true;
  const files=[],manifest=[],usedBases=new Set();
  let exported=0;
  try{
    const conf=normalizeInput(batch.items[0].raw);
    await loadFontDataFor(conf);
    for(let index=0;index<batch.items.length;index++){
      const item=batch.items[index];
      $('batch-status').textContent=`正在生成 ${index+1} / ${batch.items.length} …`;
      let base=`${item.conf.model.replace(/[^a-zA-Z0-9_-]/g,'_')||'MODEL'}_${item.conf.length}x${item.conf.width}x${item.conf.depth}mm`;
      if(usedBases.has(base)){
        let suffix=2;
        while(usedBases.has(`${base}-${suffix}`)) suffix++;
        base=`${base}-${suffix}`;
      }
      usedBases.add(base);
      try{
        const presentation=createPresentationSvg(item.raw);
        const dieline=createFlatSvg(item.raw);
        files.push({name:`效果图/${base}_效果图.svg`,data:presentation});
        files.push({name:`刀模/${base}_刀模.svg`,data:dieline});
        manifest.push({line:item.line,model:item.conf.model,category:CATEGORY[item.conf.category].description,length:item.raw.length,width:item.raw.width,depth:item.raw.depth,allowance:item.raw.allowance,finalLength:item.conf.length,finalWidth:item.conf.width,finalDepth:item.conf.depth,status:'成功',presentation:`效果图/${base}_效果图.svg`,dieline:`刀模/${base}_刀模.svg`,source:item.source});
        exported++;
      }catch(error){
        manifest.push({line:item.line,model:item.conf.model,category:CATEGORY[item.conf.category].description,length:item.raw.length,width:item.raw.width,depth:item.raw.depth,allowance:item.raw.allowance,finalLength:item.conf.length,finalWidth:item.conf.width,finalDepth:item.conf.depth,status:`生成失败：${error.message}`,presentation:'',dieline:'',source:item.source});
      }
      if(index%4===3) await new Promise(resolve=>setTimeout(resolve,0));
    }
    batch.errors.forEach(error=>manifest.push({line:error.line,model:'',category:'',length:'',width:'',depth:'',allowance:'',finalLength:'',finalWidth:'',finalDepth:'',status:`错误：${error.message}`,presentation:'',dieline:'',source:error.source}));
    manifest.sort((a,b)=>a.line-b.line);
    const header=['行','型号','分类','输入长','输入宽','输入高','余量','成品长','成品宽','成品高','状态','效果图文件','刀模文件','原始行'];
    const rows=[header,...manifest.map(row=>[row.line,row.model,row.category,row.length,row.width,row.depth,row.allowance,row.finalLength,row.finalWidth,row.finalDepth,row.status,row.presentation,row.dieline,row.source])];
    files.push({name:'清单.csv',data:`\uFEFF${rows.map(row=>row.map(csvCell).join(',')).join('\r\n')}`});
    files.push({name:'说明.txt',data:`LINOX 批量导出\n生成时间：${new Date().toLocaleString('zh-CN')}\n有效项：${exported}\n错误行：${batch.errors.length}\n目录：效果图/、刀模/、清单.csv\n`});
    download(`LINOX_批量_${batchStamp()}.zip`,createZipBlob(files),'application/zip');
    $('batch-status').textContent=`已导出 ${exported} 项${batch.errors.length?`，跳过 ${batch.errors.length} 行`:''}`;
    toast(`批量导出完成：${exported} 项`);
  }catch(error){
    $('batch-status').textContent=`导出失败：${error.message}`;
    toast(`批量导出失败：${error.message}`);
  }finally{
    button.disabled=batch.items.length===0;
  }
}

document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>setRaw({...PRESETS[btn.dataset.preset],mode:'box',allowance:2})));
form.addEventListener('input',()=>{updateSizing();render();});
form.addEventListener('change',()=>{updateSizing();render();});
form.addEventListener('submit',e=>e.preventDefault());
let batchTimer;
$('batch-input').addEventListener('input',()=>{clearTimeout(batchTimer);batchTimer=setTimeout(refreshBatch,120);});
$('batch-allowance').addEventListener('input',()=>{clearTimeout(batchTimer);batchTimer=setTimeout(refreshBatch,120);});
$('batch-export').addEventListener('click',exportBatch);
$('download-presentation').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'presentation','svg'),createPresentationSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-flat').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'dieline','svg'),createFlatSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-json').addEventListener('click',()=>safely(raw=>download(filename(raw,'config','json'),JSON.stringify({schema:1,...raw},null,2),'application/json;charset=utf-8')));
$('print-pdf').addEventListener('click',()=>exportWith(async raw=>{
  $('print-sheet').innerHTML=createPresentationSvg(raw);
  // Wait for the embedded fonts and data-URI artwork before opening print.
  await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  window.print();
}));
$('load-json').addEventListener('click',()=>$('json-file').click());
$('json-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try {const data=JSON.parse(await file.text());normalizeInput(data);setRaw(data);toast('配置已导入');}catch(err){toast('配置无效：'+err.message);}
  e.target.value='';
});
try{const saved=JSON.parse(localStorage.getItem('linox-packaging-studio:v1')||'null');if(saved){normalizeInput(saved);setRaw(saved);}else render();}catch{render();}
refreshBatch();
