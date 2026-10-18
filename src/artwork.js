import { createDieline, CATEGORY, normalizeInput } from './geometry.js';
import { illustrationSymbols } from './illustrations.js';

/** SVG is entirely procedural. No AI/image assets or external font/network dependencies. */
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const n = value => +value.toFixed(3);
const line = (x1,y1,x2,y2,other='') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${other}/>`;
const rect = (x,y,w,h,other='') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${other}/>`;
const text = (x,y,str,fs,other='') => `<text x="${n(x)}" y="${n(y)}" font-size="${n(fs)}" ${other}>${esc(str)}</text>`;

export const defs = `<defs>${illustrationSymbols()}</defs>`;

/** Vector tracing from the reference packaging image, not the original brand master. */
const WORDMARK_PATH = 'M167.85 0.00 L167.85 1.09 L184.96 23.87 L184.96 26.04 L167.85 48.83 L167.85 49.91 L183.33 49.91 L191.48 39.06 L191.48 37.98 L193.11 35.81 L193.93 35.81 L204.52 49.91 L219.19 49.91 L219.19 48.83 L202.07 26.04 L202.07 24.96 L206.15 19.53 L206.15 18.45 L219.19 1.09 L219.19 0.00 L203.70 0.00 L193.93 14.11 L193.11 14.11 L192.30 11.94 L183.33 0.00 Z M121.41 2.17 L121.41 11.94 L120.59 13.02 L120.59 16.28 L121.41 17.36 L121.41 26.04 L120.59 27.13 L120.59 35.81 L121.41 36.89 L121.41 44.49 L124.67 48.83 L126.30 49.91 L164.59 49.91 L154.81 36.89 L153.19 35.81 L133.63 35.81 L132.00 33.64 L132.00 15.19 L127.93 9.77 L128.74 8.68 L129.56 8.68 L133.63 14.11 L153.19 14.11 L154.81 16.28 L154.81 33.64 L165.41 47.74 L166.22 47.74 L166.22 5.43 L163.78 1.09 L162.15 1.09 L161.33 0.00 L123.04 0.00 L123.04 1.09 L127.93 7.60 L127.11 8.68 L126.30 8.68 Z M105.93 0.00 L105.93 27.13 L107.56 28.21 L117.33 41.23 L117.33 0.00 Z M67.63 0.00 L67.63 49.91 L79.85 49.91 L79.85 21.70 L80.67 20.62 L81.48 20.62 L103.48 49.91 L120.59 49.91 L120.59 48.83 L111.63 36.89 L110.81 36.89 L82.30 0.00 Z M50.52 0.00 L50.52 48.83 L51.33 49.91 L63.56 49.91 L63.56 0.00 Z M0.00 0.00 L0.00 49.91 L46.44 49.91 L47.26 48.83 L47.26 35.81 L46.44 34.72 L13.85 34.72 L13.04 33.64 L13.04 1.09 L12.22 0.00 Z';
const LOGO_RATIO = 0.178; // wordmark height / width, matched to the reference cartons
const FONT = `font-family="Bahnschrift,'DIN Alternate','Roboto Condensed','Arial Narrow',Arial,sans-serif"`;

/** LINOX wordmark at (x,y) top-left, `w` wide. ® sits outside `w`, top right. */
export function logo(x,y,w,{color='#c90012',registered=true}={}) {
  const xs=w/219.19, ys=w*LOGO_RATIO/49.91, r=w*.03;
  const mark=registered?`<g fill="none" stroke="${color==='#c90012'?'#1a1a1a':color}" stroke-width="${n(r*.16)}"><circle cx="${n(x+w+r*1.9)}" cy="${n(y+r*1.1)}" r="${n(r)}"/></g>${text(x+w+r*1.9,y+r*1.5,'R',r*1.15,`${FONT} font-weight="700" text-anchor="middle" fill="${color==='#c90012'?'#1a1a1a':color}"`)}`:'';
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(xs)} ${n(ys)})" fill="${color}"><path d="${WORDMARK_PATH}" fill-rule="evenodd"/></g>${mark}`;
}

function productPic(category,x,y,w,h,{shaded=false}={}) { return `<use href="#pic-${CATEGORY[category].illustration}${shaded?'-shaded':''}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`; }

/** Category label broken into at most two lines, as on the reference front panels. */
function labelLines(label) {
  if (label.length <= 16) return [label];
  const words=label.split(' ');
  let best=[label],score=Infinity;
  for (let i=1;i<words.length;i++) {
    const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');
    const sc=Math.max(a.length,b.length);
    if (sc<score) { score=sc; best=[a,b]; }
  }
  return best;
}
const fitFont=(str,size,maxW,em=.56)=>Math.min(size,maxW/(Math.max(1,str.length)*em));
const rule=(x1,y1,x2,width)=>line(x1,y1,x2,y1,`stroke="#1a1a1a" stroke-width="${n(width)}"`);

/**
 * Front panel. Layout units come from the reference carton (424 × 263): logo,
 * rule, model, rule and category stacked on the left, line art on the right.
 * Square-ish panels use a compact 300 × 300 variant.
 */
function frontArtwork(config,x,y,w,h) {
  const lines=labelLines(CATEGORY[config.category].label);
  let out='';
  if (w/h < 1.3) {
    const s=Math.min(w,h)/300, ox=x+(w-300*s)/2, oy=y+(h-300*s)/2, X=v=>ox+v*s, Y=v=>oy+v*s;
    out+=productPic(config.category,X(136),Y(172),156*s,117*s);
    out+=logo(X(22),Y(28),222*s);
    out+=rule(X(22),Y(92),X(132),1.4*s);
    out+=text(X(22),Y(148),config.model,fitFont(config.model,46*s,250*s),`${FONT} font-weight="600" fill="#151515"`);
    out+=rule(X(22),Y(166),X(132),1.4*s);
    lines.forEach((t,i)=>out+=text(X(22),Y(192+i*24),t,17.5*s,`${FONT} fill="#1d1d1d"`));
    return `<g>${out}</g>`;
  }
  const s=Math.min(w/424,h/263), oy=y+(h-263*s)/2, X=v=>x+v*s, Y=v=>oy+v*s;
  const artW=218*s, artH=artW*.75;
  out+=productPic(config.category,x+w-artW-10*s,Y(86),artW,artH);
  out+=logo(X(32),Y(48),262*s);
  out+=rule(X(32),Y(115),X(160),1.5*s);
  out+=text(X(32),Y(178),config.model,fitFont(config.model,50*s,Math.max(185*s,w-300*s)),`${FONT} font-weight="600" fill="#151515"`);
  out+=rule(X(32),Y(lines.length>1?198:194),X(160),1.5*s);
  lines.forEach((t,i)=>out+=text(X(32),Y((lines.length>1?224:222)+i*27),t,22*s,`${FONT} fill="#1d1d1d"`));
  return `<g>${out}</g>`;
}

function bearingIcon(cx,cy,r) {
  const balls=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return `<circle cx="${n(cx+r*.62*Math.cos(a))}" cy="${n(cy+r*.62*Math.sin(a))}" r="${n(r*.17)}"/>`;}).join('');
  return `<g fill="none" stroke="#151515"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r*.92)}" stroke-width="${n(r*.15)}"/><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r*.3)}" stroke-width="${n(r*.12)}"/><g stroke-width="${n(r*.1)}">${balls}</g></g>`;
}

/** Back panel: framed brand block (reference unit box 379 × 263). */
function backArtwork(config,x,y,w,h){
  const s=Math.min(w/379,h/263), oy=y+(h-263*s)/2, cx=x+w/2, Y=v=>oy+v*s;
  const fw=Math.min(w-30*s,Math.max(295*s,w*.76)), fx=cx-fw/2, top=Y(46), bottom=Y(218), rr=7*s, sw=2.4*s;
  const made='MADE IN CHINA', madeFs=12.5*s, gap=made.length*madeFs*.62/2+7*s;
  const frame=`<path d="M${n(cx-gap)},${n(bottom)}H${n(fx+rr)}Q${n(fx)},${n(bottom)} ${n(fx)},${n(bottom-rr)}V${n(top+rr)}Q${n(fx)},${n(top)} ${n(fx+rr)},${n(top)}H${n(fx+fw-rr)}Q${n(fx+fw)},${n(top)} ${n(fx+fw)},${n(top+rr)}V${n(bottom-rr)}Q${n(fx+fw)},${n(bottom)} ${n(fx+fw-rr)},${n(bottom)}H${n(cx+gap)}" fill="none" stroke="#151515" stroke-width="${n(sw)}" stroke-linejoin="round"/>`;
  const iconR=23*s, lw=166*s, groupW=iconR*2+16*s+lw+12*s, gx=cx-groupW/2;
  let out=frame+bearingIcon(gx+iconR,Y(82),iconR);
  out+=logo(gx+iconR*2+16*s,Y(67),lw,{color:'#151515'});
  out+=rule(gx+iconR*2+16*s,Y(108),gx+iconR*2+16*s+lw,1.3*s);
  out+=text(cx,Y(141),'CORROSION-RESISTANT',fitFont('CORROSION-RESISTANT',24*s,fw-24*s,.6),`${FONT} font-weight="700" text-anchor="middle" fill="#151515"`);
  out+=text(cx,Y(160),'BEARINGS & MOTION COMPONENTS',fitFont('BEARINGS & MOTION COMPONENTS',14.5*s,fw-24*s,.58),`${FONT} text-anchor="middle" fill="#151515"`);
  const web='www.linoxbearing.com', webHalf=web.length*13*s*.27+8*s;
  out+=text(cx,Y(184),web,13*s,`${FONT} text-anchor="middle" fill="#151515"`);
  out+=rule(cx-webHalf-52*s,Y(180),cx-webHalf,1.1*s)+rule(cx+webHalf,Y(180),cx+webHalf+52*s,1.1*s);
  out+=text(cx,Y(204),'ISO9001:2015',13.5*s,`${FONT} text-anchor="middle" fill="#151515"`);
  out+=text(cx,bottom+madeFs*.36,made,madeFs,`${FONT} font-weight="600" text-anchor="middle" fill="#151515"`);
  return `<g>${out}</g>`;
}

/**
 * Side panel: wordmark and model rotated 90° so they read top-to-bottom, the
 * model sitting left of the logo and end-aligned with it (reference 105 × 263).
 */
function sideArtwork(config,x,y,w,h){
  if (w>h) {
    const s=Math.min(h/105,w/263), ox=x+(w-263*s)/2;
    return `<g>${logo(ox+65*s,y+h/2-30*s,113*s)}${text(ox+186*s,y+h/2+28*s,config.model,fitFont(config.model,27*s,150*s,.52),`${FONT} font-weight="600" text-anchor="end" fill="#151515"`)}</g>`;
  }
  // The 135-unit composition is centred along the panel, as on the reference.
  const s=Math.min(h/175,w/105), ox=(h-135*s)/2, oy=(w-105*s)/2;
  const logoW=113*s, end=ox+logoW+8*s;
  return `<g transform="translate(${n(x+w)} ${n(y)}) rotate(90)">${logo(ox,oy+29*s,logoW)}${text(end,oy+82*s,config.model,fitFont(config.model,27*s,150*s,.52),`${FONT} font-weight="600" text-anchor="end" fill="#151515"`)}</g>`;
}

export function printArtwork(config,layout) {
  const {front,back,sideA,sideB}=layout.panels;
  return frontArtwork(config,front.x,0,front.w,front.h)
       +backArtwork(config,back.x,0,back.w,back.h)
       +sideArtwork(config,sideA.x,0,sideA.w,sideA.h)
       +sideArtwork(config,sideB.x,0,sideB.w,sideB.h);
}

function dimension(x1,y1,x2,y2,label,{vertical=false}={}) {
  const arrows=vertical?
    `<path d="M${n(x1-1.2)},${n(y1+2.4)}L${n(x1)},${n(y1)}L${n(x1+1.2)},${n(y1+2.4)} M${n(x1-1.2)},${n(y2-2.4)}L${n(x1)},${n(y2)}L${n(x1+1.2)},${n(y2-2.4)}"/>`:
    `<path d="M${n(x1+2.4)},${n(y1-1.2)}L${n(x1)},${n(y1)}L${n(x1+2.4)},${n(y1+1.2)} M${n(x2-2.4)},${n(y2-1.2)}L${n(x2)},${n(y2)}L${n(x2-2.4)},${n(y2+1.2)}"/>`;
  return `<g stroke="#111" fill="none" stroke-width=".3">${line(x1,y1,x2,y2)}${arrows}</g>`+ (vertical?
    `<text transform="translate(${n(x1-2)},${n((y1+y2)/2)}) rotate(-90)" font-family="Arial,sans-serif" fill="#151515" font-size="3.2" text-anchor="middle">${esc(label)}</text>`:
    text((x1+x2)/2,y1-1.6,label,3.2,'fill="#151515" font-family="Arial,sans-serif" text-anchor="middle"'));
}

/**
 * Export exact-unit flat print art with cut & fold separation. The
 * `presentation` style swaps the production colours (red cut / dashed cyan
 * score) for the reference look: grey board, red cut, thin pale-red folds.
 */
export function createFlatSvg(raw,{withDimensions=true,withArtwork=true,style='production'}={}) {
  const config=normalizeInput(raw), layout=createDieline(raw), {panels,bounds}=layout;
  const show=style==='presentation';
  const pad=withDimensions?18:5;
  const minX=-pad,minY=bounds.minY-pad;
  const sheetW=bounds.maxX+pad*2,sheetH=bounds.maxY-bounds.minY+pad*2;
  // Panels plus every flap outline closed along its fold line.
  const body=Object.entries(panels).filter(([k])=>k!=='glue').map(([,q])=>rect(q.x,0,q.w,q.h)).join('')+layout.cutPaths.map(d=>`<path d="${d}Z"/>`).join('');
  const artwork=withArtwork?printArtwork(config,layout):'';
  const cuts=layout.cutPaths.map(d=>`<path d="${d}"/>`).join('');
  const creases=layout.creasePaths.map(d=>`<path d="${d}"/>`).join('');
  const dim=withDimensions?
    dimension(panels.front.x, bounds.minY-8, panels.front.x+config.length, bounds.minY-8,`${config.length} mm`)+
    dimension(-10,0,-10,config.width,`${config.width} mm`,{vertical:true})+
    dimension(panels.sideA.x,bounds.maxY+8,panels.sideA.x+config.depth,bounds.maxY+8,`${config.depth} mm`)
    :'';
  const title = `LINOX / ${config.model} / ${config.length} × ${config.width} × ${config.depth} mm`;
  const cutStyle=show?'stroke="#e3262f" stroke-width=".42"':'stroke="#e1243b" stroke-width=".32"';
  const creaseStyle=show?'stroke="#ec8c92" stroke-width=".22"':'stroke="#13a4c8" stroke-width=".28" stroke-dasharray="1.2 1.2"';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(sheetW)}mm" height="${n(sheetH)}mm" viewBox="${n(minX)} ${n(minY)} ${n(sheetW)} ${n(sheetH)}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title><desc>Parametric dieline, red cut paths, dashed cyan score/fold paths. Concept tooling, supplier validation required.</desc>
${defs}
${show?'':rect(minX,minY,sheetW,sheetH,'fill="#fff"')}
<g id="board" fill="${show?'#f5f5f4':'#fff'}">${body}</g>
<g id="print" fill="#121212">${artwork}</g>
<g id="crease" fill="none" ${creaseStyle}>${creases}</g>
<g id="cut" fill="none" ${cutStyle} stroke-linecap="round" stroke-linejoin="round">${cuts}</g>
<g id="dimensions">${dim}</g>
</svg>`;
}

/** One exportable vector drawing of front, back and side elevations. */
export function createViewsSvg(raw) {
  const c=normalizeInput(raw), {length:L,width:W,depth:H}=c;
  const gap=13, margin=19;
  const min=0,max=L+gap+L+gap+H;
  const totalW=max+margin*2,totalH=W+margin*2+13;
  const frontX=margin, backX=frontX+L+gap,sideX=backX+L+gap,topY=margin;
  const guide=`<g stroke="#111" fill="none" stroke-width=".32">${rect(frontX,topY,L,W)}${rect(backX,topY,L,W)}${rect(sideX,topY,H,W)}</g>`;
  const cap= (x,w,title)=>text(x+w/2,topY+W+8,title,3,'text-anchor="middle" font-family="Arial,sans-serif" fill="#555"');
  const annotations=dimension(frontX,topY-9,frontX+L,topY-9,`${L} mm`)+dimension(frontX-9,topY,frontX-9,topY+W,`${W} mm`,{vertical:true})+dimension(sideX,topY-9,sideX+H,topY-9,`${H} mm`);
  const art=frontArtwork(c,frontX,topY,L,W)+backArtwork(c,backX,topY,L,W)+sideArtwork(c,sideX,topY,H,W);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(totalW)}mm" height="${n(totalH)}mm" viewBox="0 0 ${n(totalW)} ${n(totalH)}" role="img" aria-label="${esc(c.model)} three printed views">${defs}${rect(0,0,totalW,totalH,'fill="white"')}${guide}<g>${art}</g>${annotations}${cap(frontX,L,'FRONT')}${cap(backX,L,'BACK')}${cap(sideX,H,'SIDE')}</svg>`;
}

/** Closed-carton isometric vector preview, projection calculated from dimensions. */
export function createIsoSvg(raw) {
  const c=normalizeInput(raw), {length:L,width:W,depth:H}=c;
  const pad=19, dx=H*.76,dy=-H*.39;
  const x=pad,y=pad+H*.39;
  const pageW=L+dx+pad*2,pageH=W+H*.39+pad*2;
  const poly=points=>`<polygon points="${points.map(p=>p.map(n).join(',')).join(' ')}"/>`;
  const front=frontArtwork(c,x,y,L,W);
  const side=`<g transform="matrix(${n(dx/H)} ${n(dy/H)} 0 1 ${n(x+L)} ${n(y)})">${sideArtwork(c,0,0,H,W)}</g>`;
  const frontGuide=dimension(x,y+W+10,x+L,y+W+10,`${L} mm`);
  const vertGuide=dimension(x-10,y,x-10,y+W,`${W} mm`,{vertical:true});
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(pageW)}mm" height="${n(pageH+10)}mm" viewBox="0 0 ${n(pageW)} ${n(pageH+10)}" role="img" aria-label="${esc(c.model)} 3D closed carton illustration">${defs}
  <g fill="#f4f4f4" stroke="#999" stroke-width=".28">${poly([[x,y],[x+dx,y+dy],[x+L+dx,y+dy],[x+L,y]])}</g>
  <g fill="#e6e6e6" stroke="#999" stroke-width=".28">${poly([[x+L,y],[x+L+dx,y+dy],[x+L+dx,y+W+dy],[x+L,y+W]])}</g>
  <g fill="white" stroke="#888" stroke-width=".28">${rect(x,y,L,W)}</g>
  ${front}${side}${frontGuide}${vertGuide}
  ${text(x+L+dx*.5,y+W*.5+dy*.5,`${H} mm`,Math.max(1.8,Math.min(3,H*.2)),'fill="#555" font-family="Arial,sans-serif" text-anchor="middle"')}
  </svg>`;
}

export function previewFaceArtwork(config,kind,w,h) {
  if(kind==='front')return frontArtwork(config,0,0,w,h);
  if(kind==='back')return backArtwork(config,0,0,w,h);
  return sideArtwork(config,0,0,w,h);
}
export function productArtworkForPreview(category,w,h,options) {
  return productPic(category,0,0,w,h,options);
}
