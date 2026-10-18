import { createDieline, normalizeInput } from './geometry.js';
import { defs, createFlatSvg, productArtworkForPreview, previewFaceArtwork } from './artwork.js';
import { OPEN_PHOTOS } from './photo-data.js';

// Presentation only: box views are deliberately enlarged to show typography.
// The die below and exported dieline preserve real millimetre proportions.
const v=n=>Number(n.toFixed(3));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function line(x1,y1,x2,y2,color='#222',width=1.1){return `<line x1="${v(x1)}" y1="${v(y1)}" x2="${v(x2)}" y2="${v(y2)}" stroke="${color}" stroke-width="${width}"/>`;}
function label(x,y,s,{size=13,color='#74777b',anchor='middle',weight='500'}={}){return `<text x="${v(x)}" y="${v(y)}" fill="${color}" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text>`;}
function ticks(x,y,w,h){return `<g stroke="#a09f9b" stroke-width=".9" opacity=".8">${line(x+1,y+13,x+1,y+2)}${line(x+1,y+2,x+12,y+2)}${line(x+w-12,y+2,x+w-1,y+2)}${line(x+w-1,y+2,x+w-1,y+13)}</g>`;}
function panel(x,y,w,h,raw,type){
  const config=normalizeInput(raw);
  const art=previewFaceArtwork(config,type,w,h);
  return `<g filter="url(#softBoxShadow)">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#paperGrad)" stroke="#c2c0bd" stroke-width="1.35"/>
  <path d="M${x+4},${y+9}L${x+w-4},${y+9}" stroke="#fff" opacity=".88" stroke-width="2"/>
  <path d="M${x+4},${y+h-6}L${x+w-4},${y+h-6}" stroke="#aaa" opacity=".13"/>
  <g transform="translate(${x} ${y})">${art}</g>
  ${ticks(x,y,w,h)}</g>`;
}
function sizeArrow(x1,x2,y,txt){
  return `<g stroke="#383838" stroke-width="1.35" fill="none">
    <path d="M${x1},${y-11}V${y+13}M${x2},${y-11}V${y+13}" opacity=".6"/>
    <path d="M${x1},${y}H${x2} M${x1+8},${y-4}L${x1},${y}L${x1+8},${y+4} M${x2-8},${y-4}L${x2},${y}L${x2-8},${y+4}"/>
  </g>${label((x1+x2)/2,y-12,txt,{size:17,color:'#252525',weight:'700'})}`;
}
function heightArrow(x,y,h,txt){return `<g stroke="#383838" fill="none" stroke-width="1.25"><path d="M${x-8},${y}H${x+11}M${x-8},${y+h}H${x+11}M${x},${y}V${y+h}"/><path d="M${x-4},${y+8}L${x},${y}L${x+4},${y+8}M${x-4},${y+h-8}L${x},${y+h}L${x+4},${y+h-8}"/></g><text x="${x-13}" y="${y+h/2}" transform="rotate(-90 ${x-13} ${y+h/2})" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#252525">${esc(txt)}</text>`;}
function openCarton(x,y,w,h,raw){
  const c=normalizeInput(raw);
  const sx=w/320,sy=h/275;
  // Mathematical vector mock-up of the open carton; not a photo or AI generated raster.
  const bag=`<path d="M34 122 L279 110 L276 217 L44 222 Z" fill="url(#polyBag)" stroke="#bfc0c2" stroke-width="2" opacity=".9"/>
  <path d="M47 137Q95 116 152 129T270 122M45 210L89 201L111 214L183 204L248 214L270 188M54 140L40 164L48 187L37 205M267 131L272 161L264 178L271 193" fill="none" stroke="#fff" stroke-width="3" opacity=".65"/>`;
  return `<g transform="translate(${x} ${y}) scale(${v(sx)} ${v(sy)})">
    <ellipse cx="160" cy="255" rx="140" ry="13" fill="#292929" opacity=".12" filter="url(#blur)"/>
    <path d="M31 105L16 15Q14 5 23 7L270 23Q281 24 282 39L300 122Z" fill="url(#paperGrad)" stroke="#999" stroke-width="1.5"/>
    <path d="M26 14L267 30L273 106L42 103Z" fill="#eee" stroke="#d6d4d3" stroke-width="1"/>
    <path d="M29 104L282 103L301 134L284 226L24 237L12 141Z" fill="#fff" stroke="#aaa" stroke-width="1.8"/>
    <path d="M32 120L280 116L276 208L39 216Z" fill="#e8e9ec" stroke="#aeb0b2" stroke-width="1.7"/>
    ${bag}
    <g transform="translate(68 139)">${productArtworkForPreview(c.category,190,70)}</g>
    <path d="M22 218L285 213L279 255L28 253Z" fill="url(#paperGrad)" stroke="#9c9c9c" stroke-width="1.4"/>
    <path d="M31 235L275 232" stroke="white" stroke-width="3" opacity=".78"/>
    <path d="M13 141L23 219L30 253L19 244L6 167Z" fill="#e9e9e9" stroke="#a7a7a7"/>
    ${label(160,248,'LINOX',12,{color:'#777',weight:'700'})}
  </g>`;
}

export function createPresentationSvg(raw){
  const c=normalizeInput(raw);
  const dieline=createDieline(raw);
  const square=c.length/c.width<1.6;
  const W=1440, headerH=420, stageBottom=930;
  const frontW=square?250:362,backW=frontW,sideW=square?91:95;
  const faceH=square?246:216;
  const openW=345,openH=277;
  const gap=square?29:22;
  const rowW=frontW+backW+sideW+openW+3*gap;
  const left=(W-rowW)/2;
  const frontX=left,backX=frontX+frontW+gap,sideX=backX+backW+gap,openX=sideX+sideW+gap;
  const y=122+(250-faceH)/2;
  const top= `<rect x="0" y="0" width="1440" height="${headerH}" fill="url(#stageGrad)"/>
  ${label(50,36,'LINOX   /   PACKAGING PRESENTATION',{anchor:'start',size:13,color:'#bc1d2c',weight:'700'})}
  ${label(1390,36,`${esc(c.model)}  ·  ${c.length} × ${c.width} × ${c.depth} mm`,{anchor:'end',size:13,color:'#656568',weight:'700'})}
  ${panel(frontX,y,frontW,faceH,raw,'front')}
  ${panel(backX,y,backW,faceH,raw,'back')}
  ${panel(sideX,y,sideW,faceH,raw,'side')}
  ${OPEN_PHOTOS[c.category] ? `<image x="${openX}" y="68" width="${openW}" height="${openH+43}" preserveAspectRatio="xMidYMid meet" href="${OPEN_PHOTOS[c.category]}"/>` : openCarton(openX,y-17,openW,openH,raw)}
  ${sizeArrow(frontX,frontX+frontW,y-30,`${c.length} mm`)}
  ${sizeArrow(sideX,sideX+sideW,y-30,`${c.depth} mm`)}
  ${heightArrow(frontX-17,y,faceH,`${c.width} mm`)}
  ${label(frontX+frontW/2,395,'FRONT / 正面',{size:12})}
  ${label(backX+backW/2,395,'BACK / 背面',{size:12})}
  ${label(sideX+sideW/2,395,'SIDE / 侧面',{size:12})}
  ${label(openX+openW/2,395,OPEN_PHOTOS[c.category]?'REFERENCE BOX / 分类示例':'OPEN BOX / 结构示意',{size:12})}`;

  // The physical geometry stays exact-unit and proportional below. The SVG is
  // embedded within a larger artboard for review, never altering die coordinates.
  const b=dieline.bounds;
  const dW=b.maxX-b.minX, dH=b.maxY-b.minY;
  const targetW=1310,targetH=410;
  const scale=Math.min(targetW/dW,targetH/dH);
  const actualW=dW*scale,actualH=dH*scale;
  const dx=(W-actualW)/2,dy=475+(targetH-actualH)/2;
  const flat=createFlatSvg(raw,{withDimensions:false});
  const naked=flat.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>[\s\S]*?<\/title>/,'').replace(/<desc>[\s\S]*?<\/desc>/,'');
  const dielineArt=`<rect x="0" y="420" width="1440" height="${stageBottom-420}" fill="#ffffff"/>
  ${label(50,456,'DIELINE / 刀模展开',{anchor:'start',size:16,color:'#222',weight:'700'})}
  ${label(1390,456,'CUT · red   /   FOLD · blue   /   印刷文件保持真实毫米尺寸',{anchor:'end',size:12,color:'#9a9a9a'})}
  <g transform="translate(${v(dx)} ${v(dy)}) scale(${v(scale)}) translate(${-b.minX} ${-b.minY})">${naked}</g>
  ${label(720,917,'视觉效果预览（上） · 精确等比例刀模（下） · 正式开模须包装厂复核',{size:12,color:'#8b8b8b'})}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="${stageBottom}" viewBox="0 0 1440 ${stageBottom}" role="img" aria-label="${esc(c.model)} 包装效果与刀模综合预览">
  <defs>
   <linearGradient id="stageGrad" x1="0" y1="0" x2="0.3" y2="1"><stop stop-color="#ebebec"/><stop offset=".6" stop-color="#f7f7f6"/><stop offset="1" stop-color="#dcdde0"/></linearGradient>
   <linearGradient id="paperGrad" x1="0" y1="0" x2="0.4" y2="1"><stop stop-color="#fdfdfd"/><stop offset=".18" stop-color="#fff"/><stop offset=".88" stop-color="#f7f7f6"/><stop offset="1" stop-color="#e4e4e4"/></linearGradient>
   <linearGradient id="polyBag" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f3f4f7" stop-opacity=".7"/><stop offset=".5" stop-color="#c8c9cb" stop-opacity=".37"/><stop offset="1" stop-color="#f6f6f8" stop-opacity=".8"/></linearGradient>
   <filter id="softBoxShadow" x="-20%" y="-25%" width="150%" height="170%"><feDropShadow dx="2" dy="10" stdDeviation="8" flood-color="#111" flood-opacity=".17"/></filter>
   <filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>${defs}${top}${dielineArt}</svg>`;
}