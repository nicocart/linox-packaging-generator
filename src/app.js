import { CATEGORY, normalizeInput } from './geometry.js';
import { createPresentationSvg, createBatchIndexSvgs } from './presentation.js';
import { loadFontDataFor } from './fonts.js';
import { BEARING_CATALOG } from './bearing-catalog.js';

const $=id=>document.getElementById(id);
const catalogByModel=new Map(BEARING_CATALOG.map(entry=>[`${entry.category}:${entry.model}`,entry]));
const CATEGORY_ORDER=['rod','radial','deep'];
const BATCH_STORAGE_KEY='linox-packaging-batch:v1';
const batch={rows:[],items:[],activeId:null,nextId:1};

function saveBatchRows(){
  try{
    localStorage.setItem(BATCH_STORAGE_KEY,JSON.stringify(batch.rows.map(row=>batchRaw(row))));
  }catch{
    // Storage can be unavailable in private or restricted contexts.
  }
}
function readBatchRows(){
  try{
    const raw=localStorage.getItem(BATCH_STORAGE_KEY);
    if(raw===null) return null;
    const data=JSON.parse(raw);
    return Array.isArray(data)?data:null;
  }catch{
    return null;
  }
}
function toast(message){
  const t=$('toast');t.textContent=message;t.classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),3200);
}
function makeElement(tag,className,text){
  const element=document.createElement(tag);
  if(className) element.className=className;
  if(text!==undefined) element.textContent=text;
  return element;
}
function clearPreview(message='还没有数据行。请从型号库选择，或点击“新增一行”。'){
  const drawing=$('drawing');
  drawing.innerHTML='';
  drawing.textContent=message;
  drawing.classList.add('invalid');
  $('drawing-caption').textContent='等待输入';
  $('scale-note').textContent='暂无预览';
}
function renderPreview(raw){
  try{
    normalizeInput(raw);
    const output=createPresentationSvg(raw,{embedFonts:false});
    $('drawing').innerHTML=output;
    $('drawing').classList.remove('invalid');
    $('drawing-caption').textContent='上方正反侧面及开盒效果 · 下方完整刀模展开';
    $('scale-note').textContent='矢量几何 · 名义毫米';
  }catch(error){
    clearPreview(error.message);
  }
}
function initBatchCatalog(){
  const select=$('batch-catalog');
  for(const category of CATEGORY_ORDER){
    const entries=BEARING_CATALOG.filter(entry=>entry.category===category);
    if(!entries.length) continue;
    const group=document.createElement('optgroup');
    group.label=CATEGORY[category].description;
    for(const entry of entries) group.append(new Option(entry.display,`${entry.category}:${entry.model}`));
    select.append(group);
  }
  select.addEventListener('change',()=>{
    const entry=catalogByModel.get(select.value);
    if(!entry) return;
    const blank=batch.rows.find(row=>!row.model.value.trim()&&!row.length.value.trim()&&!row.width.value.trim()&&!row.depth.value.trim());
    if(blank){
      blank.model.value=entry.model;
      blank.category.value=entry.category;
      blank.length.value=entry.length;
      blank.width.value=entry.width;
      blank.depth.value=entry.depth;
      blank.model.focus();
      refreshBatch();
      if(!batch.activeId){
        batch.activeId=blank.id;
        renderPreview(blank.raw);
        refreshBatch();
      }
    }else{
      const row=addBatchRow({model:entry.model,category:entry.category,length:entry.length,width:entry.width,depth:entry.depth},true);
      if(!batch.activeId){
        batch.activeId=row.id;
        renderPreview(row.raw);
        refreshBatch();
      }
    }
    select.value='';
  });
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
  saveBatchRows();
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
  const numberInput=(value,placeholder,min=5,max=600)=>{
    const input=document.createElement('input');
    input.type='number';input.min=String(min);input.max=String(max);input.step='0.1';input.placeholder=placeholder;
    if(value!==undefined) input.value=value;
    return input;
  };
  const length=numberInput(initial.length,'如 80'),width=numberInput(initial.width,'如 20'),depth=numberInput(initial.depth,'如 13');
  const quantity=numberInput(initial.quantity??1,'1',1,999999);quantity.step='1';
  const allowance=numberInput(initial.allowance??3,'3',0,30);
  fields.append(field('型号',model),field('分类',category),field('长',length),field('宽',width),field('高',depth),field('余量',allowance),field('数量',quantity));
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
  return row;
}
function removeBatchRow(id){
  const index=batch.rows.findIndex(row=>row.id===id);
  if(index<0) return;
  const wasActive=batch.activeId===id;
  batch.rows[index].el.remove();
  batch.rows.splice(index,1);
  if(wasActive){
    batch.activeId=null;
    clearPreview();
  }
  refreshBatch();
}
function previewBatchRow(id){
  refreshBatch();
  const row=batch.rows.find(item=>item.id===id);
  if(!row||!row.conf){toast(row?.error??'请先补全这一行');return;}
  batch.activeId=id;
  renderPreview(row.raw);
  refreshBatch();
  $('preview-card').scrollIntoView({behavior:'smooth',block:'start'});
  toast(`已载入 ${row.conf.model}`);
}
function previewFirstRow(){
  const item=batch.items[0];
  if(!item){clearPreview();return;}
  batch.activeId=item.row.id;
  renderPreview(item.raw);
  refreshBatch();
}
function batchStamp(){
  const date=new Date(),pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
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
    const indexPages=createBatchIndexSvgs(batch.items.map(item=>item.raw));
    const itemPages=batch.items.map(item=>`<section class="print-page">${createPresentationSvg(item.raw)}</section>`);
    sheet.innerHTML=[...indexPages.map(svg=>`<section class="print-page">${svg}</section>`),...itemPages].join('');
    const skipped=batch.rows.filter(row=>row.error).length;
    $('batch-status').textContent=`已准备 ${indexPages.length+itemPages.length} 页（含 ${indexPages.length} 页清单）${skipped?`，跳过 ${skipped} 行`:''}，请在打印窗口选择“另存为 PDF”`;
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const previousTitle=document.title;
    document.title=`LINOX_批量_${batchStamp()}`;
    window.print();
    setTimeout(()=>{document.title=previousTitle;},1000);
  }catch(error){
    $('batch-status').textContent=`PDF 准备失败：${error.message}`;
    toast(`PDF 准备失败：${error.message}`);
  }finally{
    button.disabled=batch.items.length===0;
  }
}

$('batch-add').addEventListener('click',()=>addBatchRow({category:'rod',allowance:3},true));
$('batch-export').addEventListener('click',printBatch);
initBatchCatalog();
const savedBatch=readBatchRows();
if(savedBatch===null){
  addBatchRow({model:'SI15C',category:'rod',length:80,width:20,depth:13,allowance:3});
  addBatchRow({model:'GE17C',category:'radial',length:29,width:29,depth:13,allowance:3});
  addBatchRow({model:'S6004-2RS',category:'deep',length:43,width:43,depth:12,allowance:3});
}else{
  const rows=savedBatch.filter(row=>row&&typeof row==='object');
  rows.forEach(row=>addBatchRow(row));
  refreshBatch();
}
previewFirstRow();
