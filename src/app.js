import { CATEGORY, PRESETS, normalizeInput, assessLayout } from './geometry.js';
import { createFlatSvg } from './artwork.js';
import { createPresentationSvg } from './presentation.js';
import { loadFontDataFor } from './fonts.js';
import { createZipBlob } from './zip.js';

const $=id=>document.getElementById(id);
const form=$('params');
const fields=['model','category','length','width','depth','quantity','allowance'];
let pending=null;
const batch={rows:[],items:[],activeId:null,nextId:1};

function currentRaw() {
  return Object.fromEntries([...fields.map(x=>[x,form.elements.namedItem(x).value]),['mode',form.elements.namedItem('mode').value]]);
}
function setRaw(raw) {
  const input={...PRESETS.SI15C,quantity:1,...raw};
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
    $('summary-quantity').textContent=`数量：${conf.quantity} 件`;
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
function batchRaw(row){
  return {
    model:row.model.value.trim(),
    category:row.category.value,
    length:Number(row.length.value),
    width:Number(row.width.value),
    depth:Number(row.depth.value),
    quantity:row.quantity.value.trim()===''?1:Number(row.quantity.value),
    mode:'product',
    allowance:row.allowance.value.trim()===''?3:Number(row.allowance.value),
  };
}
function batchSource(raw){
  if(!raw) return '';
  return [raw.model,CATEGORY[raw.category]?.description??'',raw.length,raw.width,raw.depth,raw.quantity,raw.allowance].join(', ');
}
function refreshBatch(){
  batch.items=[];
  batch.rows.forEach((row,index)=>{
    row.line=index+1;
    const raw=batchRaw(row);
    const blank=!raw.model&&!row.length.value&&!row.width.value&&!row.depth.value;
    row.el.classList.toggle('active',batch.activeId===row.id);
    if(blank){
      row.raw=null;row.conf=null;row.error=null;
      row.result.textContent='等待输入';
      row.result.classList.remove('error');
      row.el.classList.remove('error');
      return;
    }
    row.raw=raw;
    try{
      row.conf=normalizeInput(raw);
      row.error=null;
      row.result.textContent=`→ ${row.conf.length} × ${row.conf.width} × ${row.conf.depth} mm（成品） · 数量 ${row.conf.quantity}`;
      row.result.classList.remove('error');
      row.el.classList.remove('error');
      batch.items.push({raw,conf:row.conf,row});
    }catch(error){
      row.conf=null;row.error=error.message;
      row.result.textContent=error.message;
      row.result.classList.add('error');
      row.el.classList.add('error');
    }
  });
  const errors=batch.rows.filter(row=>row.error).length;
  const parts=[];
  if(batch.items.length) parts.push(`${batch.items.length} 条可生成`);
  if(errors) parts.push(`${errors} 条错误`);
  $('batch-status').textContent=parts.length?parts.join(' · '):'还没有可用的数据行';
  $('batch-export').disabled=batch.items.length===0;
  $('batch-empty').hidden=batch.rows.length>0;
}
function addBatchRow(initial={},focus=false){
  const id=batch.nextId++;
  const el=makeElement('div','batch-item');
  const fields=makeElement('div','batch-fields');
  const field=(label,control)=>{
    const wrap=makeElement('label','batch-field');
    wrap.append(makeElement('span',undefined,label),control);
    return wrap;
  };
  const model=document.createElement('input');
  model.type='text';model.maxLength=40;model.placeholder='如 SI15C';model.value=initial.model??'';
  const category=document.createElement('select');
  category.append(...Object.entries(CATEGORY).map(([key,{description}])=>new Option(description,key)));
  category.value=initial.category??'rod';
  const numberInput=(value,placeholder,min=8,max=600)=>{
    const input=document.createElement('input');
    input.type='number';input.min=String(min);input.max=String(max);input.step='0.1';input.placeholder=placeholder;
    if(value!==undefined) input.value=value;
    return input;
  };
  const length=numberInput(initial.length,'如 80'),width=numberInput(initial.width,'如 20'),depth=numberInput(initial.depth,'如 13');
  const quantity=numberInput(initial.quantity??1,'1',1,999999);quantity.step='1';
  const allowance=numberInput(initial.allowance??3,'3',0,30);
  fields.append(field('型号',model),field('分类',category),field('长',length),field('宽',width),field('高',depth),field('数量',quantity),field('余量',allowance));
  const foot=makeElement('div','batch-item-foot');
  const result=makeElement('span','batch-result','等待输入');
  const actions=makeElement('div','batch-actions');
  const preview=makeElement('button','batch-preview','预览');preview.type='button';
  const remove=makeElement('button','batch-remove','删除');remove.type='button';
  actions.append(preview,remove);
  foot.append(result,actions);
  el.append(fields,foot);
  const row={id,el,model,category,length,width,depth,quantity,allowance,result,line:0,raw:null,conf:null,error:null};
  batch.rows.push(row);
  $('batch-rows').append(el);
  for(const control of [model,category,length,width,depth,quantity,allowance]){
    control.addEventListener('input',refreshBatch);
    control.addEventListener('change',refreshBatch);
  }
  preview.addEventListener('click',()=>previewBatchRow(id));
  remove.addEventListener('click',()=>removeBatchRow(id));
  refreshBatch();
  if(focus) model.focus();
}
function removeBatchRow(id){
  const index=batch.rows.findIndex(row=>row.id===id);
  if(index<0) return;
  batch.rows[index].el.remove();
  batch.rows.splice(index,1);
  if(batch.activeId===id) batch.activeId=null;
  refreshBatch();
}
function previewBatchRow(id){
  refreshBatch();
  const row=batch.rows.find(item=>item.id===id);
  if(!row||!row.conf){toast(row?.error??'请先补全这一行');return;}
  batch.activeId=id;
  setRaw({...row.raw});
  refreshBatch();
  $('preview-card').scrollIntoView({behavior:'smooth',block:'start'});
  toast(`已载入 ${row.conf.model}`);
}
function batchStamp(){
  const date=new Date(),pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
const csvCell=value=>{
  const text=String(value??'');
  return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};
async function printBatch(){
  refreshBatch();
  if(!batch.items.length){toast('没有可导出的数据行');return;}
  const button=$('batch-export');
  button.disabled=true;
  try{
    const conf=normalizeInput(batch.items[0].raw);
    await loadFontDataFor(conf);
    const sheet=$('print-sheet');
    sheet.className='batch-print';
    document.documentElement.classList.add('batch-print');
    document.body.classList.add('batch-print');
    sheet.innerHTML=batch.items.map(item=>`<section class="print-page">${createPresentationSvg(item.raw)}</section>`).join('');
    const skipped=batch.rows.filter(row=>row.error).length;
    $('batch-status').textContent=`已准备 ${batch.items.length} 页${skipped?`，跳过 ${skipped} 行`:''}，请在打印窗口选择“另存为 PDF”`;
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const previousTitle=document.title;
    document.title=`LINOX_批量_${batchStamp()}`;
    window.print();
    setTimeout(()=>{
      document.title=previousTitle;
      document.documentElement.classList.remove('batch-print');
      document.body.classList.remove('batch-print');
    },1000);
  }catch(error){
    $('batch-status').textContent=`PDF 准备失败：${error.message}`;
    toast(`PDF 准备失败：${error.message}`);
  }finally{
    button.disabled=batch.items.length===0;
  }
}
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
        manifest.push({line:item.row.line,model:item.conf.model,category:CATEGORY[item.conf.category].description,length:item.raw.length,width:item.raw.width,depth:item.raw.depth,quantity:item.conf.quantity,allowance:item.raw.allowance,finalLength:item.conf.length,finalWidth:item.conf.width,finalDepth:item.conf.depth,status:'成功',presentation:`效果图/${base}_效果图.svg`,dieline:`刀模/${base}_刀模.svg`,source:batchSource(item.raw)});
        exported++;
      }catch(error){
        manifest.push({line:item.row.line,model:item.conf.model,category:CATEGORY[item.conf.category].description,length:item.raw.length,width:item.raw.width,depth:item.raw.depth,quantity:item.conf.quantity,allowance:item.raw.allowance,finalLength:item.conf.length,finalWidth:item.conf.width,finalDepth:item.conf.depth,status:`生成失败：${error.message}`,presentation:'',dieline:'',source:batchSource(item.raw)});
      }
      if(index%4===3) await new Promise(resolve=>setTimeout(resolve,0));
    }
    const errorRows=batch.rows.filter(row=>row.error);
    errorRows.forEach(row=>manifest.push({line:row.line,model:row.raw?.model??'',category:row.raw&&CATEGORY[row.raw.category]?CATEGORY[row.raw.category].description:'',length:row.raw?.length??'',width:row.raw?.width??'',depth:row.raw?.depth??'',quantity:row.raw?.quantity??'',allowance:row.raw?.allowance??'',finalLength:'',finalWidth:'',finalDepth:'',status:`错误：${row.error}`,presentation:'',dieline:'',source:batchSource(row.raw)}));
    manifest.sort((a,b)=>a.line-b.line);
    const header=['行','型号','分类','输入长','输入宽','输入高','数量','余量','成品长','成品宽','成品高','状态','效果图文件','刀模文件','原始行'];
    const rows=[header,...manifest.map(row=>[row.line,row.model,row.category,row.length,row.width,row.depth,row.quantity,row.allowance,row.finalLength,row.finalWidth,row.finalDepth,row.status,row.presentation,row.dieline,row.source])];
    files.push({name:'清单.csv',data:`\uFEFF${rows.map(row=>row.map(csvCell).join(',')).join('\r\n')}`});
    files.push({name:'说明.txt',data:`LINOX 批量导出\n生成时间：${new Date().toLocaleString('zh-CN')}\n有效项：${exported}\n错误行：${errorRows.length}\n目录：效果图/、刀模/、清单.csv\n`});
    download(`LINOX_批量_${batchStamp()}.zip`,createZipBlob(files),'application/zip');
    $('batch-status').textContent=`已导出 ${exported} 项${errorRows.length?`，跳过 ${errorRows.length} 行`:''}`;
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
$('batch-add').addEventListener('click',()=>addBatchRow({category:'rod',allowance:3},true));
$('batch-export').addEventListener('click',printBatch);
$('batch-export-svg').addEventListener('click',exportBatch);
$('download-presentation').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'presentation','svg'),createPresentationSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-flat').addEventListener('click',()=>exportWith(raw=>download(filename(raw,'dieline','svg'),createFlatSvg(raw),'image/svg+xml;charset=utf-8')));
$('download-json').addEventListener('click',()=>safely(raw=>download(filename(raw,'config','json'),JSON.stringify({schema:1,...raw},null,2),'application/json;charset=utf-8')));
$('print-pdf').addEventListener('click',()=>exportWith(async raw=>{
  $('print-sheet').className='';
  document.documentElement.classList.remove('batch-print');
  document.body.classList.remove('batch-print');
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
addBatchRow({model:'SI15C',category:'rod',length:80,width:20,depth:13,allowance:3});
addBatchRow({model:'GE17C',category:'radial',length:29,width:29,depth:13,allowance:3});
addBatchRow({model:'S6004-2RS',category:'deep',length:43,width:43,depth:12,allowance:3});
