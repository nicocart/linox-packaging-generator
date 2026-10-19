import { createDieline, CATEGORY, normalizeInput } from './geometry.js';
import { ASSETS, FONT_FACES } from './assets.js';

/** SVG is entirely procedural. No AI/image assets or external font/network dependencies. */
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const n = value => +value.toFixed(3);
const line = (x1,y1,x2,y2,other='') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${other}/>`;
const rect = (x,y,w,h,other='') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${other}/>`;
const text = (x,y,str,fs,other='') => `<text x="${n(x)}" y="${n(y)}" font-size="${n(fs)}" ${other}>${esc(str)}</text>`;

/**
 * Supplied raster artwork as reusable symbols: the category product drawing
 * and the back-panel brand block. Only the current category is embedded.
 * `metalTone` tints white line art grey for the opened-carton mock-up.
 */
const symbol=(id,{width,height,href})=>`<symbol id="${id}" viewBox="0 0 ${width} ${height}"><image href="${href}" width="${width}" height="${height}"/></symbol>`;
export function artDefs(category) {
  const key=CATEGORY[category].illustration;
  return `<defs><style>${FONT_FACES}</style>${symbol(`pic-${key}`,ASSETS[key])}${symbol('back-panel',ASSETS['back-panel'])}
<filter id="metalTone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".74 0 0 0 .02  0 .76 0 0 .02  0 0 .79 0 .03  0 0 0 1 0"/></filter></defs>`;
}

/** Official LINOX wordmark (linox-astro/src/images/linox-logo.svg), clip-path construction flattened to paths. */
const WORDMARK_PATH = 'M9.2148 7.5742H26.4414V42.3125H66.9648V59.5352H9.2148Z'
  + 'M70.5703 7.5742H87.793V59.5352H70.5703Z'
  + 'M91.8516 7.5742L91.8828 59.5352H109.1211V28.7813L139.875 59.5352H161.1875V55.5039L113.2578 7.5742Z'
  + 'M144.0117 7.5742V30.418L161.1875 47.5977V7.5742Z'
  + 'M174.9141 7.5742L190.8516 24.7969H218.1953V41.9609L235.418 59.1875V7.5742Z'
  + 'M183.3086 42.3125V25.1328L166.082 7.9063V46.293L179.3242 59.5352H228.1641L210.9375 42.3125Z'
  + 'M289.7422 7.5742L237.7813 59.5352H263.125L315.0859 7.5742Z'
  + 'M273.8359 18.4063L263.1406 7.5742H237.8125L261.1719 31.0703Z'
  + 'M279.0469 48.7188L289.7266 59.5352H315.0703L291.7109 36.0547Z';
const WORDMARK_BOX = { x: 9.2148, y: 7.5742, w: 305.871, h: 51.961 };
const LINOX_RED = '#e60012';
const FONT = `font-family="Barlow,'Segoe UI',Arial,sans-serif"`;

/** LINOX wordmark at (x,y) top-left, `w` wide. ® sits outside `w`, top right. */
export function logo(x,y,w,{color=LINOX_RED,registered=true}={}) {
  const k=w/WORDMARK_BOX.w;
  const regSize=w*.066, regColor=color===LINOX_RED?'#171717':color;
  // A real registered trademark glyph. Avoid a disjoint circle and letter R.
  const registeredMark=registered?text(x+w+regSize*.10,y+regSize*.88,'®',regSize,
    'font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="'+regColor+'"'):'';
  return '<g transform="translate('+n(x)+' '+n(y)+') scale('+n(k)+') translate('+
    (-WORDMARK_BOX.x)+' '+(-WORDMARK_BOX.y)+')" fill="'+color+'"><path d="'+WORDMARK_PATH+'"/></g>'+registeredMark;
}

function productPic(category,x,y,w,h,{shaded=false}={}) {
  const key=CATEGORY[category].illustration;
  // The deep-groove render is already shaded; only line art needs toning.
  return `<use href="#pic-${key}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${shaded&&key!=='deep'?' filter="url(#metalTone)"':''}/>`;
}

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

export function getLayoutProfile(width,height) {
  if (!(width>0 && height>0)) throw new Error('Invalid front dimensions');
  if (height<15 || width<25) return 'compact';
  if (width/height>=2.25) return 'wide';
  if (width/height<=1.3) return 'square';
  return 'landscape';
}

// The same fixed SVG image is reused for each category; only its placement changes.
function diagonalBands(w,h,kind='front') {
  const tint=kind==='back'?'#cdd1d6':'#cbd0d6';
  const pts=(p)=>p.map(([xx,yy])=>`${n(xx*w)},${n(yy*h)}`).join(' ');
  return `<g data-layer="diagonal-branding" fill="${tint}" pointer-events="none">
    <polygon points="${pts([[.26,1],[.335,1],[.565,0],[.49,0]])}" opacity=".26"/>
    <polygon points="${pts([[.355,1],[.38,1],[.61,0],[.585,0]])}" opacity=".23"/>
    <polygon points="${pts([[.79,1],[.975,1],[1.15,0],[.965,0]])}" opacity=".32"/>
    <polygon points="${pts([[.715,1],[.755,1],[.93,0],[.89,0]])}" opacity=".14"/>
  </g>`;
}
function faceBands(x,y,w,h,kind) {
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"
    viewBox="0 0 ${n(w)} ${n(h)}" overflow="hidden">${diagonalBands(w,h,kind)}</svg>`;
}

function wideFrontArtwork(config,x,y,w,h){
  const rows=labelLines(CATEGORY[config.category].label);
  const left=w*.052, twoRows=rows.length>1;
  const markWidth=Math.min(w*.53,h*2.57);
  const titleSize=fitFont(config.model,h*(twoRows?.235:.283),w*.46,.58);
  const maxRow=Math.max(...rows.map(t=>t.length));
  const subSize=Math.min(h*(twoRows?.099:.123),w*.45/(maxRow*.53));
  // Deliberately no two decorative lines; strong model type and spacing.
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}" overflow="hidden" data-layout="wide">
    ${diagonalBands(w,h,'front')}
    ${productPic(config.category,w*.57,-h*.073,w*.414,h*1.17)}
    ${logo(left,h*.13,markWidth)}
    ${text(left,h*(twoRows?.728:.76),config.model,titleSize,`font-family="Arial Black",Arial,Helvetica,sans-serif font-weight="900" fill="#151515" stroke="#151515" stroke-width="${n(titleSize*.038)}" stroke-linejoin="round" paint-order="stroke fill"`)}
    ${rows.map((t,i)=>text(left,h*(twoRows?.83:.943)+i*h*.105,t,subSize,`${FONT} font-weight="600" fill="#252525"`)).join('')}
  </svg>`;
}

function frontArtwork(config,x,y,w,h) {
  const profile=getLayoutProfile(w,h);
  if(profile==='wide') return wideFrontArtwork(config,x,y,w,h);
  const lines=labelLines(CATEGORY[config.category].label);
  let out='';
  if (profile==='square' || profile==='compact') {
    const s=Math.min(w,h)/300, ox=x+(w-300*s)/2, oy=y+(h-300*s)/2, X=v=>ox+v*s, Y=v=>oy+v*s;
    out+=productPic(config.category,X(136),Y(172),156*s,117*s);
    out+=logo(X(22),Y(28),222*s);
    out+=rule(X(22),Y(92),X(132),1.4*s);
    out+=text(X(22),Y(148),config.model,fitFont(config.model,46*s,250*s),`${FONT} font-weight="600" fill="#151515"`);
    out+=rule(X(22),Y(166),X(132),1.4*s);
    lines.forEach((t,i)=>out+=text(X(22),Y(192+i*24),t,17.5*s,`${FONT} fill="#1d1d1d"`));
    return `<g data-layout="${profile}">${faceBands(x,y,w,h,'front')}${out}</g>`;
  }
  const s=Math.min(w/424,h/263), oy=y+(h-263*s)/2, X=v=>x+v*s, Y=v=>oy+v*s;
  const artW=218*s;
  out+=productPic(config.category,x+w-artW-10*s,Y(86),artW,artW*.75);
  out+=logo(X(32),Y(48),262*s);
  out+=rule(X(32),Y(115),X(160),1.5*s);
  out+=text(X(32),Y(178),config.model,fitFont(config.model,50*s,Math.max(185*s,w-300*s)),`${FONT} font-weight="600" fill="#151515"`);
  out+=rule(X(32),Y(lines.length>1?198:194),X(160),1.5*s);
  lines.forEach((t,i)=>out+=text(X(32),Y((lines.length>1?224:222)+i*27),t,22*s,`${FONT} fill="#1d1d1d"`));
  return `<g data-layout="landscape">${faceBands(x,y,w,h,'front')}${out}</g>`;
}

function bearingSeal(x,y,size) {
  // Closely follows the thick-cage, eight-roller emblem of the source artwork.
  const cx=x+size/2,cy=y+size/2,r=size*.435;
  let out='<g fill="none" stroke="#171717" stroke-width="'+n(size*.074)+'">';
  out+='<circle cx="'+n(cx)+'" cy="'+n(cy)+'" r="'+n(r)+'"/>';
  out+='<circle cx="'+n(cx)+'" cy="'+n(cy)+'" r="'+n(size*.248)+'" stroke-width="'+n(size*.095)+'"/>';
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const px=cx+size*.322*Math.cos(a),py=cy+size*.322*Math.sin(a);
    out+='<circle cx="'+n(px)+'" cy="'+n(py)+'" r="'+n(size*.085)+'" stroke="none" fill="#171717"/>';
  }
  return out+'</g>';
}

// Wide cartons reflow brand elements instead of uniformly downscaling a square graphic.
function backArtwork(config,x,y,w,h) {
  const {width,height}=ASSETS['back-panel'];
  const wide=getLayoutProfile(w,h)==='wide';
  const maxW=wide?w*.44:w*.88;
  const maxH=wide?h*.81:h*.86;
  const bw=Math.min(maxW,maxH*width/height);
  const bh=bw*height/width;
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"
    viewBox="0 0 ${n(w)} ${n(h)}" overflow="hidden" data-layout="${wide?'wide-back':'standard-back'}">
    ${diagonalBands(w,h,'back')}
    <use href="#back-panel" x="${n((w-bw)/2)}" y="${n((h-bh)/2)}"
      width="${n(bw)}" height="${n(bh)}"
      data-brand-badge="compact" data-badge-width="${n(bw)}"
      data-badge-height="${n(bh)}"/>
  </svg>`;
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
${artDefs(config.category)}
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
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(totalW)}mm" height="${n(totalH)}mm" viewBox="0 0 ${n(totalW)} ${n(totalH)}" role="img" aria-label="${esc(c.model)} three printed views">${artDefs(c.category)}${rect(0,0,totalW,totalH,'fill="white"')}${guide}<g>${art}</g>${annotations}${cap(frontX,L,'FRONT')}${cap(backX,L,'BACK')}${cap(sideX,H,'SIDE')}</svg>`;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(pageW)}mm" height="${n(pageH+10)}mm" viewBox="0 0 ${n(pageW)} ${n(pageH+10)}" role="img" aria-label="${esc(c.model)} 3D closed carton illustration">${artDefs(c.category)}
  <g fill="#f4f4f4" stroke="#999" stroke-width=".28">${poly([[x,y],[x+dx,y+dy],[x+L+dx,y+dy],[x+L,y]])}</g>
  <g fill="#e6e6e6" stroke="#999" stroke-width=".28">${poly([[x+L,y],[x+L+dx,y+dy],[x+L+dx,y+W+dy],[x+L,y+W]])}</g>
  <g fill="white" stroke="#888" stroke-width=".28">${rect(x,y,L,W)}</g>
  ${front}${side}${frontGuide}${vertGuide}
  ${text(x+L+dx*.5+2,y+dy*.5-2,`${H} mm`,Math.max(1.8,Math.min(3,H*.2)),'fill="#555" font-family="Arial,sans-serif" text-anchor="start"')}
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
