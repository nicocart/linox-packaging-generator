import { normalizeInput } from './geometry.js';
import { artDefs, createFlatSvg, productArtworkForPreview, previewFaceArtwork } from './artwork.js';

/*
 * Presentation board in the layout of the approved reference sheets: front,
 * back and side faces plus an opened carton on a grey stage, and the printed
 * dieline below. Faces and dieline use one fixed display proportion so every
 * SKU reads the same way; the dimension labels carry the real millimetres.
 * The exact-unit production die is exported separately by createFlatSvg().
 */
const v=n=>Number(n.toFixed(2));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const FONT=`font-family="'Segoe UI','Noto Sans',Arial,sans-serif"`;
const label=(x,y,s,{size=20,color='#2a2a2a',anchor='middle',weight='400',extra=''}={})=>`<text x="${v(x)}" y="${v(y)}" fill="${color}" ${FONT} font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

const PAGE_W=1448, PAGE_H=1086, STAGE_H=520;
// Display faces in reference proportion: front/back 424 × 263, side 105 × 263.
const FACE={ w:415, h:258, side:103 };
// Template carton in mm with the same L:W:H as the display faces.
const TEMPLATE={ length:84.8, width:52.6, depth:21 };

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
 * Opened carton seen from the front-right, lid hinged at the back and raised,
 * product lying in a poly bag. Real 3D points projected to the page.
 */
function openCarton(ox,oy,config){
  const L=285, D=175, H=96;
  const ex=[.97,.085], ey=[.3,-.74];
  const P=(x,y,z)=>[ox+x*ex[0]+y*ey[0], oy+x*ex[1]+y*ey[1]-z];
  const poly=(pts,attrs)=>`<path d="M${pts.map(p=>p.map(v).join(',')).join('L')}Z" ${attrs}/>`;
  const phi=100*Math.PI/180, dir=[0,-Math.cos(phi),Math.sin(phi)], tuckDir=[0,-Math.sin(phi),-Math.cos(phi)];
  const tip=(x,k=D)=>P(x,D+dir[1]*k,H+dir[2]*k);
  const T=30;
  const tuck=x=>P(x,D+dir[1]*D+tuckDir[1]*T,H+dir[2]*D+tuckDir[2]*T);
  const lid=poly([P(0,D,H),P(L,D,H),tip(L),tip(0)],'fill="url(#lidGrad)" stroke="#a9aaad" stroke-width="1.2" stroke-linejoin="round"');
  const lidTuck=poly([tip(0),tip(L),tuck(L-8),tuck(8)],'fill="#f3f3f3" stroke="#a9aaad" stroke-width="1.1" stroke-linejoin="round"');
  const back=poly([P(0,D,0),P(L,D,0),P(L,D,H),P(0,D,H)],'fill="#dcdcdd"');
  const left=poly([P(0,0,0),P(0,D,0),P(0,D,H),P(0,0,H)],'fill="#cfd0d2"');
  const floor=poly([P(0,0,0),P(L,0,0),P(L,D,0),P(0,D,0)],'fill="#e6e6e7"');
  const front=poly([P(0,0,0),P(L,0,0),P(L,0,H),P(0,0,H)],'fill="url(#wallFront)" stroke="#a5a6a9" stroke-width="1.2" stroke-linejoin="round"');
  const right=poly([P(L,0,0),P(L,D,0),P(L,D,H),P(L,0,H)],'fill="url(#wallSide)" stroke="#a5a6a9" stroke-width="1.2" stroke-linejoin="round"');
  const rim=`<path d="M${P(0,0,H).map(v)}L${P(L,0,H).map(v)}L${P(L,D,H).map(v)}" fill="none" stroke="#fff" stroke-width="2.4"/>`;
  // Poly bag occupying most of the floor, with crinkle highlights.
  const [bx,by]=P(L*.06,D*.9,H*.55), [cx,cy]=P(L*.5,D*.55,H*.95);
  const bagPath=`M${v(bx)},${v(by)}L${P(L*.95,D*.92,H*.55).map(v)}L${P(L*.97,D*.12,H*.85).map(v)}L${P(L*.04,D*.08,H*.85).map(v)}Z`;
  const bag=`<clipPath id="bagClip"><path d="${bagPath}"/></clipPath><path d="${bagPath}" fill="url(#bagGrad)" stroke="#c4c6c9" stroke-width="1.4" stroke-linejoin="round"/>`;
  const crinkle=`<g fill="none" stroke="#fff" stroke-linecap="round" opacity=".8" clip-path="url(#bagClip)">
    <path d="M${v(cx-130)},${v(cy-38)}q30,-14 60,-4t70,-6" stroke-width="2.6"/>
    <path d="M${v(cx-125)},${v(cy+48)}q40,10 80,-2t90,6" stroke-width="2.2"/>
    <path d="M${v(cx+95)},${v(cy-70)}q-10,30 4,56t-8,52" stroke-width="2"/>
    <path d="M${v(cx-118)},${v(cy-10)}q14,20 2,40" stroke-width="1.8"/>
    <path d="M${v(cx-60)},${v(cy-62)}l40,8l50,-6l40,10" stroke-width="1.4" stroke="#b9bbbf" opacity=".6"/></g>`;
  const pw=205, ph=pw*.75;
  const product=`<g transform="translate(${v(cx-pw/2-6)} ${v(cy-ph/2+4)})">${productArtworkForPreview(config.category,pw,ph,{shaded:true})}</g>`;
  const film=`<path d="${bagPath}" fill="url(#filmGrad)"/>`;
  const shadow=`<ellipse cx="${v(P(L*.55,D*.3,0)[0])}" cy="${v(P(L*.5,0,0)[1]+12)}" rx="${v(L*.62)}" ry="16" fill="#1d1f22" opacity=".2" filter="url(#blur6)"/>`;
  return `<g>${shadow}${lid}${lidTuck}${back}${left}${floor}${bag}${product}${film}${crinkle}${front}${right}${rim}</g>`;
}

export function createPresentationSvg(raw){
  const c=normalizeInput(raw);
  const {w:fw,h:fh,side:sw}=FACE;
  const gap=26, frontX=62, backX=frontX+fw+gap, sideX=backX+fw+gap, faceY=196;
  const stage=`<rect width="${PAGE_W}" height="${STAGE_H}" fill="url(#stageGrad)"/>
  ${face(frontX,faceY,fw,fh,c,'front')}
  ${face(backX,faceY,fw,fh,c,'back')}
  ${face(sideX,faceY,sw,fh,c,'side')}
  ${dimH(frontX,frontX+fw,166,faceY,`${c.length} mm`)}
  ${dimH(sideX,sideX+sw,166,faceY,`${c.depth} mm`)}
  ${dimV(34,faceY,faceY+fh,frontX,`${c.width} mm`)}
  ${openCarton(1078,492,c)}`;

  // Printed dieline at display proportion, generated by the same geometry
  // and artwork code as the production export.
  const tpl={...raw,...TEMPLATE,mode:'box'};
  const flat=createFlatSvg(tpl,{withDimensions:false,style:'presentation'});
  const vb=flat.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner=flat.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title>[\s\S]*?<\/title>/,'').replace(/<desc>[\s\S]*?<\/desc>/,'').replace(/<defs>[\s\S]*?<\/defs>/,'');
  const areaW=PAGE_W-80, areaH=PAGE_H-STAGE_H-40;
  const scale=Math.min(areaW/vb[2],areaH/vb[3]);
  const dx=(PAGE_W-vb[2]*scale)/2, dy=STAGE_H+(areaH-vb[3]*scale)/2+8;
  const die=`<rect y="${STAGE_H}" width="${PAGE_W}" height="${PAGE_H-STAGE_H}" fill="#fff"/>
  <g transform="translate(${v(dx)} ${v(dy)}) scale(${v(scale)}) translate(${-vb[0]} ${-vb[1]})">${inner}</g>
  ${label(PAGE_W-24,PAGE_H-16,'示意比例 · 生产请导出精确毫米刀模 SVG',{size:12,color:'#b3b3b3',anchor:'end'})}`;

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
  </defs>${artDefs(c.category)}${stage}${die}</svg>`;
}
