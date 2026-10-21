import { CATEGORY, normalizeInput } from './geometry.js';
import { artDefs, createFlatSvg, logo, productArtworkForPreview, previewFaceArtwork } from './artwork.js';
import { CATEGORY_FONT, MODEL_FONT, fontAttrs, fontFaceEmbedCssFor, textWidth } from './fonts.js';

/*
 * Presentation board in the layout of the approved reference sheets: front,
 * back and side faces plus an opened carton on a grey stage, and the printed
 * dieline below. Every face, the opened carton and the dieline are drawn in
 * the carton's real L : W : H proportion, each scaled to fit its region.
 */
const v=n=>Number(n.toFixed(2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Annotation text in the chosen print font (regular weight).
let labelFont='barlow';
const label=(x,y,s,{size=20,color='#2a2a2a',anchor='middle',extra=''}={})=>`<text x="${v(x)}" y="${v(y)}" fill="${color}" ${fontAttrs(labelFont,'regular')} font-size="${size}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;
function quantityBadge(c){
  const size=28;
  const text=`数量 ${c.quantity}`;
  const padX=18,padY=12;
  const boxW=textWidth(text,labelFont,'regular',size)+padX*2;
  const boxH=size+padY*2;
  const x=PAGE_W-28-boxW,y=18;
  return `<g>
  <rect x="${v(x)}" y="${v(y)}" width="${v(boxW)}" height="${v(boxH)}" rx="9" fill="#e60012"/>
  <text x="${v(x+boxW-padX)}" y="${v(y+boxH/2+size*.35)}" fill="#fff" ${fontAttrs(labelFont,'regular')} font-size="${size}" font-weight="600" text-anchor="end">${esc(text)}</text>
  </g>`;
}

const PAGE_W=1448, PAGE_H=1086, STAGE_H=520;
// Stage regions in page px: closed faces on the left, opened carton on the right.
const FACES={ left:70, right:1030, mid:322, maxH:270, gap:26 };
const OPEN={ left:1062, right:1428, bottom:500, maxH:430 };

/** Closed carton face with a sliver of the top panel and a contact shadow. */
function face(x,y,w,h,config,kind){
  const lip=5;
  return `<g>
  <ellipse cx="${v(x+w/2)}" cy="${v(y+h+3)}" rx="${v(w*.52)}" ry="7" fill="#1d1f22" opacity=".16" filter="url(#blur6)"/>
  <path d="M${x+2},${y}L${x+5},${y-lip}H${x+w-5}L${x+w-2},${y}Z" fill="#fbfbfb" stroke="#b9babc" stroke-width=".9"/>
  <path d="M${x+5},${y-lip}l3,-1.6M${x+w-5},${y-lip}l-3,-1.6" stroke="#c5c6c8" stroke-width=".9"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#faceGrad)" stroke="#b4b5b8" stroke-width="1"/>
  <g transform="translate(${x} ${y})">${previewFaceArtwork(config,kind,w,h)}</g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#faceSheen)"/>
  </g>`;
}

function dimH(x1,x2,y,boxTop,txt){
  return `<g stroke="#3a3a3a" stroke-width="1.2" fill="#3a3a3a">
  <path d="M${x1},${y-8}V${boxTop-6}M${x2},${y-8}V${boxTop-6}" fill="none"/>
  <path d="M${x1},${y}H${x2}" fill="none"/>
  <path d="M${x1},${y}l9,-3.5v7zM${x2},${y}l-9,-3.5v7z" stroke="none"/></g>
  ${label((x1+x2)/2,y-10,txt,{size:21})}`;
}
function dimV(x,y1,y2,boxLeft,txt){
  const cy=(y1+y2)/2;
  return `<g stroke="#3a3a3a" stroke-width="1.2" fill="#3a3a3a">
  <path d="M${x-8},${y1}H${boxLeft-6}M${x-8},${y2}H${boxLeft-6}" fill="none"/>
  <path d="M${x},${y1}V${y2}" fill="none"/>
  <path d="M${x},${y1}l-3.5,9h7zM${x},${y2}l-3.5,-9h7z" stroke="none"/></g>
  ${label(x-12,cy,txt,{size:21,extra:`transform="rotate(-90 ${v(x-12)} ${v(cy)})"`})}`;
}

/**
 * Opened carton lying on its back, seen from the front-right: footprint L × W,
 * walls H high, the L × W lid hinged at the back and raised, as on the
 * reference sheets. Product lies in a poly bag.
 * Real 3D points are projected, then scaled to fit the OPEN region.
 */
function openCarton(config){
  const ex=[.97,.085], ey=[.3,-.74];
  const phi=100*Math.PI/180, dir=[-Math.cos(phi),Math.sin(phi)], tuckDir=[-Math.sin(phi),-Math.cos(phi)];
  const L0=config.length, D0=config.width, H0=config.depth, T0=Math.min(D0*.3,H0*.9);
  // Fit: bounding box of every corner at unit scale.
  const raw=(x,y,z)=>[x*ex[0]+y*ey[0], x*ex[1]+y*ey[1]-z];
  const lidY=D0+dir[0]*D0, lidZ=H0+dir[1]*D0;
  const corners=[[0,0,0],[L0,0,0],[L0,D0,0],[0,0,H0],[L0,D0,H0],[0,lidY,lidZ],[L0,lidY,lidZ],[L0,lidY+tuckDir[0]*T0,lidZ+tuckDir[1]*T0],[0,lidY+tuckDir[0]*T0,lidZ+tuckDir[1]*T0]].map(p=>raw(...p));
  const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
  const bw=Math.max(...xs)-Math.min(...xs), bh=Math.max(...ys)-Math.min(...ys);
  const k=Math.min((OPEN.right-OPEN.left)/bw, OPEN.maxH/bh);
  const ox=(OPEN.left+OPEN.right)/2-k*(Math.max(...xs)+Math.min(...xs))/2, oy=OPEN.bottom-k*Math.max(...ys);
  const L=L0*k, D=D0*k, H=H0*k, T=T0*k, u=Math.min(L,D*1.6)/285; // u: decoration scale
  const P=(x,y,z)=>[ox+x*ex[0]+y*ey[0], oy+x*ex[1]+y*ey[1]-z];
  const poly=(pts,attrs)=>`<path d="M${pts.map(p=>p.map(v).join(',')).join('L')}Z" ${attrs}/>`;
  const tip=x=>P(x,D+dir[0]*D,H+dir[1]*D);
  const tuck=x=>P(x,D+dir[0]*D+tuckDir[0]*T,H+dir[1]*D+tuckDir[1]*T);
  const inset=Math.min(8,L*.03);
  const lid=poly([P(0,D,H),P(L,D,H),tip(L),tip(0)],'fill="url(#lidGrad)" stroke="#a9aaad" stroke-width="1.2" stroke-linejoin="round"');
  const lidTuck=poly([tip(0),tip(L),tuck(L-inset),tuck(inset)],'fill="#f3f3f3" stroke="#a9aaad" stroke-width="1.1" stroke-linejoin="round"');
  const back=poly([P(0,D,0),P(L,D,0),P(L,D,H),P(0,D,H)],'fill="#dcdcdd"');
  const left=poly([P(0,0,0),P(0,D,0),P(0,D,H),P(0,0,H)],'fill="#cfd0d2"');
  const floor=poly([P(0,0,0),P(L,0,0),P(L,D,0),P(0,D,0)],'fill="#e6e6e7"');
  const front=poly([P(0,0,0),P(L,0,0),P(L,0,H),P(0,0,H)],'fill="url(#wallFront)" stroke="#a5a6a9" stroke-width="1.2" stroke-linejoin="round"');
  // The front wall is only L × H (carton depth), much flatter than the front
  // face, so it carries a small centred wordmark instead of a squeezed copy
  // of the front artwork.
  const [faceOX,faceOY]=P(0,0,H);
  const markW=Math.min(L*.36,H*.42/.17), markH=markW*.17;
  const frontPrint=`<g data-open-box-print="true" transform="matrix(${v(ex[0])} ${v(ex[1])} 0 1 ${v(faceOX)} ${v(faceOY)})">
    ${logo((L-markW)/2,(H-markH)/2,markW,{font:config.modelFont ?? config.font})}
  </g>`;

  const right=poly([P(L,0,0),P(L,D,0),P(L,D,H),P(L,0,H)],'fill="url(#wallSide)" stroke="#a5a6a9" stroke-width="1.2" stroke-linejoin="round"');
  const rim=`<path d="M${P(0,0,H).map(v)}L${P(L,0,H).map(v)}L${P(L,D,H).map(v)}" fill="none" stroke="#fff" stroke-width="2.4"/>`;
  // Poly bag filling the opening, with crinkle highlights.
  const [cx,cy]=P(L*.5,D*.5,H*.95);
  const bagPath=`M${P(L*.05,D*.92,H*.6).map(v)}L${P(L*.95,D*.94,H*.6).map(v)}L${P(L*.97,D*.1,H*.9).map(v)}L${P(L*.04,D*.06,H*.9).map(v)}Z`;
  const bag=`<clipPath id="bagClip"><path d="${bagPath}"/></clipPath><path d="${bagPath}" fill="url(#bagGrad)" stroke="#c4c6c9" stroke-width="1.4" stroke-linejoin="round"/>`;
  const crinkle=`<g fill="none" stroke="#fff" stroke-linecap="round" opacity=".8" clip-path="url(#bagClip)" transform="translate(${v(cx)} ${v(cy)}) scale(${v(u)})">
    <path d="M-130,-38q30,-14 60,-4t70,-6" stroke-width="2.6"/>
    <path d="M-125,48q40,10 80,-2t90,6" stroke-width="2.2"/>
    <path d="M95,-70q-10,30 4,56t-8,52" stroke-width="2"/>
    <path d="M-118,-10q14,20 2,40" stroke-width="1.8"/></g>`;
  // Product fitted to the opening; the front wall overlaps its lower part.
  const pw=L*.8, ph=Math.min(pw*.75,D*.74+H*.9);
  const product=`<g transform="translate(${v(cx-pw/2)} ${v(cy-ph/2)})">${productArtworkForPreview(config.category,pw,ph,{shaded:true})}</g>`;
  const film=`<path d="${bagPath}" fill="url(#filmGrad)"/>`;
  const shadow=`<ellipse cx="${v(P(L*.55,D*.3,0)[0])}" cy="${v(P(L*.5,0,0)[1]+10)}" rx="${v(L*.6)}" ry="14" fill="#1d1f22" opacity=".2" filter="url(#blur6)"/>`;
  return `<g>${shadow}${lid}${lidTuck}${back}${left}${floor}${bag}${product}${film}${crinkle}${front}${frontPrint}${right}${rim}</g>`;
}

export function createPresentationSvg(raw,{embedFonts=true}={}){
  const c=normalizeInput(raw);
  labelFont=c.font;
  // One px-per-mm scale for all three faces, so they keep the real L : W : H.
  const k=Math.min((FACES.right-FACES.left-2*FACES.gap)/(2*c.length+c.depth), FACES.maxH/c.width);
  const fw=c.length*k, fh=c.width*k, sw=c.depth*k;
  const frontX=FACES.left+(FACES.right-FACES.left-2*FACES.gap-2*fw-sw)/2;
  const backX=frontX+fw+FACES.gap, sideX=backX+fw+FACES.gap, faceY=FACES.mid-fh/2;
  const stage=`<rect width="${PAGE_W}" height="${STAGE_H}" fill="url(#stageGrad)"/>
  ${face(frontX,faceY,fw,fh,c,'front')}
  ${face(backX,faceY,fw,fh,c,'back')}
  ${face(sideX,faceY,sw,fh,c,'side')}
  ${dimH(frontX,frontX+fw,faceY-30,faceY,`${c.length} mm`)}
  ${dimH(sideX,sideX+sw,faceY-30,faceY,`${c.depth} mm`)}
  ${dimV(frontX-26,faceY,faceY+fh,frontX,`${c.width} mm`)}
  ${openCarton(c)}
  ${quantityBadge(c)}`;

  // Printed dieline from the same geometry and artwork code as the production export.
  const flat=createFlatSvg(raw,{withDimensions:false,style:'presentation',embedFonts:false});
  const vb=flat.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner=flat.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>[\s\S]*?<\/title>/,'').replace(/<desc>[\s\S]*?<\/desc>/,'').replace(/<defs>[\s\S]*?<\/defs>/,'');
  const areaW=PAGE_W-80, areaH=PAGE_H-STAGE_H-40;
  const scale=Math.min(areaW/vb[2],areaH/vb[3]);
  const dx=(PAGE_W-vb[2]*scale)/2, dy=STAGE_H+(areaH-vb[3]*scale)/2+8;
  const die=`<rect y="${STAGE_H}" width="${PAGE_W}" height="${PAGE_H-STAGE_H}" fill="#fff"/>
  <g transform="translate(${v(dx)} ${v(dy)}) scale(${v(scale)}) translate(${-vb[0]} ${-vb[1]})">${inner}</g>
  ${label(PAGE_W-24,PAGE_H-16,'真实比例 · 生产请导出精确毫米刀模 SVG',{size:12,color:'#b3b3b3',anchor:'end'})}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}" role="img" aria-label="${esc(c.model)} 包装效果与刀模综合预览">
  <defs>
   <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e4e5e7"/><stop offset=".55" stop-color="#d9dadc"/><stop offset="1" stop-color="#cbccce"/></linearGradient>
   <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".85" stop-color="#f8f8f8"/><stop offset="1" stop-color="#ececec"/></linearGradient>
   <linearGradient id="faceSheen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".0"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#9a9a9a" stop-opacity=".08"/></linearGradient>
   <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f1f1f1"/><stop offset="1" stop-color="#dcdcdd"/></linearGradient>
   <linearGradient id="wallFront" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#ececed"/></linearGradient>
   <linearGradient id="wallSide" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#f4f4f5"/><stop offset="1" stop-color="#dedfe0"/></linearGradient>
   <linearGradient id="bagGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9eaec"/><stop offset=".5" stop-color="#cfd1d4"/><stop offset="1" stop-color="#e2e3e5"/></linearGradient>
   <linearGradient id="filmGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
   <filter id="blur6" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>${artDefs(c,{embedFonts})}${stage}${die}</svg>`;
}

const INDEX_PER_PAGE=24;
export function createBatchIndexSvgs(rawItems,{embedFonts=true}={}){
  const configs=rawItems.map(normalizeInput);
  if(!configs.length) return [];
  const totalQuantity=configs.reduce((sum,item)=>sum+item.quantity,0);
  const categoryCount=new Set(configs.map(item=>item.category)).size;
  const pageCount=Math.ceil(configs.length/INDEX_PER_PAGE);
  const date=new Date().toLocaleDateString('zh-CN');
  const fontCss=embedFonts?fontFaceEmbedCssFor(configs[0]):'';
  const cards=[
    {label:'包装款数',value:String(configs.length),color:'#252a31'},
    {label:'总数量',value:String(totalQuantity),color:'#e60012'},
    {label:'覆盖分类',value:String(categoryCount),color:'#252a31'},
  ];
  return Array.from({length:pageCount},(_,pageIndex)=>{
    const start=pageIndex*INDEX_PER_PAGE;
    const pageItems=configs.slice(start,start+INDEX_PER_PAGE);
    const rows=pageItems.map((item,offset)=>{
      const index=start+offset;
      const y=412+offset*26;
      const page=pageCount+index+1;
      const fill=offset%2?'#f7f7f5':'#fff';
      return `<g>
      <rect x="64" y="${y-18}" width="1320" height="26" fill="${fill}"/>
      <line x1="64" y1="${y+8}" x2="1384" y2="${y+8}" stroke="#ecece8" stroke-width="1"/>
      <text x="92" y="${y}" fill="#8a8a84" ${fontAttrs(MODEL_FONT,'regular')} font-size="14">${index+1}</text>
      <text x="172" y="${y}" fill="#252a31" ${fontAttrs(MODEL_FONT,'regular')} font-size="16" font-weight="600">${esc(item.model)}</text>
      <text x="520" y="${y}" fill="#4a4a44" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="15">${esc(CATEGORY[item.category].description)}</text>
      <text x="830" y="${y}" fill="#4a4a44" ${fontAttrs(MODEL_FONT,'regular')} font-size="15">${item.length} × ${item.width} × ${item.depth} mm</text>
      <text x="1140" y="${y}" fill="#e60012" ${fontAttrs(MODEL_FONT,'regular')} font-size="19" font-weight="600">${item.quantity}</text>
      <text x="1360" y="${y}" fill="#6f6f68" ${fontAttrs(MODEL_FONT,'regular')} font-size="14" text-anchor="end">第 ${page} 页</text>
      </g>`;
    }).join('');
    const cardSvg=cards.map((card,index)=>{
      const x=64+index*445;
      return `<g>
      <rect x="${x}" y="184" width="429" height="92" rx="10" fill="#fff" stroke="#e2e2dd"/>
      <text x="${x+22}" y="214" fill="#8a8a84" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="13">${card.label}</text>
      <text x="${x+22}" y="252" fill="${card.color}" ${fontAttrs(MODEL_FONT,'regular')} font-size="32" font-weight="600">${card.value}</text>
      </g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}" role="img" aria-label="LINOX 批量包装清单">
    <defs>${fontCss?`<style>${fontCss}</style>`:''}</defs>
    <rect width="${PAGE_W}" height="${PAGE_H}" fill="#f4f4f1"/>
    <text x="64" y="86" fill="#e60012" ${fontAttrs(MODEL_FONT,'regular')} font-size="38" font-weight="600">LINOX</text>
    <text x="64" y="128" fill="#252a31" ${fontAttrs(MODEL_FONT,'regular')} font-size="24" font-weight="600">包装清单</text>
    <text x="1384" y="86" fill="#6f6f68" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="13" text-anchor="end">批量包装总览</text>
    <text x="1384" y="110" fill="#8a8a84" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12" text-anchor="end">生成日期：${esc(date)}</text>
    <line x1="64" y1="148" x2="1384" y2="148" stroke="#d8d8d2" stroke-width="1"/>
    ${cardSvg}
    <text x="64" y="326" fill="#252a31" ${fontAttrs(MODEL_FONT,'regular')} font-size="20" font-weight="600">包装明细</text>
    <text x="1384" y="326" fill="#8a8a84" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12" text-anchor="end">尺寸为成品纸盒外尺寸，单位 mm</text>
    <rect x="64" y="362" width="1320" height="34" fill="#252a31"/>
    <text x="92" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12">序号</text>
    <text x="172" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12">型号</text>
    <text x="520" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12">分类</text>
    <text x="830" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12">成品尺寸</text>
    <text x="1140" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12">数量</text>
    <text x="1360" y="384" fill="#fff" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="12" text-anchor="end">PDF 页</text>
    ${rows}
    <line x1="64" y1="1044" x2="1384" y2="1044" stroke="#d8d8d2" stroke-width="1"/>
    <text x="64" y="1066" fill="#8a8a84" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="11">LINOX Packaging Generator</text>
    <text x="1384" y="1066" fill="#8a8a84" ${fontAttrs(CATEGORY_FONT,'regular')} font-size="11" text-anchor="end">清单 ${pageIndex+1} / ${pageCount}</text>
    </svg>`;
  });
}
