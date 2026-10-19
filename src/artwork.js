import { createDieline, CATEGORY, normalizeInput } from './geometry.js';
import { ASSETS } from './assets.js';
import { fontAttrs, fontFaceEmbedCssFor, fontFaceUrlCssFor, textWidth, capHeight, fitSize } from './fonts.js';

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
/**
 * Shared <defs>: every print font the config uses (embedded for exported files,
 * loaded by URL for the live page), the category drawing and the back panel.
 */
export function artDefs(config,{embedFonts=true}={}) {
  const key=CATEGORY[config.category].illustration;
  const fontCss=embedFonts?fontFaceEmbedCssFor(config):fontFaceUrlCssFor(config);
  return `<defs><style>${fontCss}</style>${symbol(`pic-${key}`,ASSETS[key])}${symbol('back-panel',ASSETS['back-panel'])}
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
const LOGO_RATIO = WORDMARK_BOX.h / WORDMARK_BOX.w;

/**
 * ® drawn as vector: a ring plus the chosen font's "R", centred by its real
 * cap height and advance width. The print fonts' web subsets carry no ®
 * glyph, so a typed ® would silently fall back to a system font.
 */
const REG_SIZE=.42;  // ring diameter / wordmark height
const REG_GAP=.12;   // gap before the ring / ring diameter
function registeredMark(x,top,d,color,font){
  const r=d/2, cx=x+r, cy=top+r, fs=d*.62/capHeight(font,'medium',1);
  const rx=cx-textWidth('R',font,'medium',fs)/2, ry=cy+capHeight(font,'medium',fs)/2;
  return `<g data-role="registered"><circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r*.92)}" fill="none" stroke="${color}" stroke-width="${n(d*.08)}"/>${text(rx,ry,'R',fs,`${fontAttrs(font,'medium')} fill="${color}"`)}</g>`;
}
/** Horizontal room ® takes beyond the wordmark, as a fraction of logo width. */
const REG_EXTRA=REG_SIZE*(1+REG_GAP)*WORDMARK_BOX.h/WORDMARK_BOX.w;

/** LINOX wordmark at (x,y) top-left, `w` wide; ® sits outside `w`, top-aligned. */
export function logo(x,y,w,{color=LINOX_RED,registered=true,font}={}) {
  const k=w/WORDMARK_BOX.w, d=REG_SIZE*w*LOGO_RATIO;
  const mark=registered?registeredMark(x+w+d*REG_GAP,y,d,color===LINOX_RED?'#171717':color,font):'';
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)}) translate(${-WORDMARK_BOX.x} ${-WORDMARK_BOX.y})" fill="${color}"><path d="${WORDMARK_PATH}"/></g>${mark}`;
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
const rule=(x1,y1,x2,width)=>line(x1,y1,x2,y1,`stroke="#1a1a1a" stroke-width="${n(width)}"`);

export function getLayoutProfile(width,height) {
  if (!(width>0 && height>0)) throw new Error('Invalid front dimensions');
  if (height<15 || width<25) return 'compact';
  if (width/height>=2.25) return 'wide';
  if (width/height<=1.3) return 'square';
  return 'landscape';
}

// Gentle bearing-race watermark: three open-looking circles and one fine accent.
// It is deliberately quieter than the diagonal striped background.
function precisionWatermark(w,h,side='front'){
  const back=side==='back', cx=w*(back?.04:.99), cy=h*(back?.52:.47);
  const rings=[.52,.78,1.06].map((ratio,i)=>`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(h*ratio)}" fill="none" stroke="#8894a3" stroke-width="${n(Math.max(.12,h*.0035))}" opacity="${[.20,.14,.10][i]}"/>`).join('');
  return `<g data-layer="bearing-watermark" pointer-events="none">${rings}</g>`;
}

/**
 * Front panel, one design for every carton (SI15C master): logo, model and
 * category stacked on the left, product drawing on the right.
 *
 * Every size and gap is a multiple of the model's cap height C, so the stack
 * keeps the same proportions on long and square cartons. C is the largest
 * value at which the stack fits the panel height and its column width; any
 * spare height becomes margin around the block, never extra line spacing.
 * The drawing then takes the area right of the text (wide panels) or right
 * of the text and below the logo (square panels), so they cannot overlap.
 */
// × C; subPitch × subCap. Long cartons carry a larger logo (the established
// SI15C look); square ones are width-limited, so their logo stays in step with the text.
const STACK={ logoHWide:1.5, logoHSquare:1.22, gapModel:.5, subCap:.6, subPitch:1.5 };
const MODEL_PITCH=1.12;
// Short rule under the front wordmark: half the wordmark width. The thicker
// stroke and generous lower gap separate the logo from the model line.
const RULE={ widthRatio:.5, gapBefore:.36, gapAfter:1, thickness:.095 };
function frontArtwork(config,x,y,w,h){
  const modelFont=config.modelFont ?? config.font;
  const categoryFont=config.categoryFont ?? modelFont;
  const rows=labelLines(CATEGORY[config.category].label);
  const profile=getLayoutProfile(w,h), wide=w/h>=1.6;
  // Wide faces are long but shallow: use a width-aware side margin so the logo
  // and copy never sit against the crease, and keep a proportional top/bottom margin.
  const padX=Math.max(Math.min(w,h)*.10, w*.06), padY=Math.min(w,h)*.12;
  // Category line width per unit of its own cap height.
  const subWPerCap=Math.max(...rows.map(r=>textWidth(r,categoryFont,'medium',1)))/capHeight(categoryFont,'medium',1);
  const logoToModel=RULE.gapBefore+RULE.thickness+RULE.gapAfter;
  // Column widths: wide panels keep logo and text in the left ~55%; square
  // panels let the logo span the top and keep text in the left ~60%.
  const textCol=w*(wide?.55:.6)-padX;
  // A long SKU may wrap at a hyphen instead of shrinking the whole type scale.
  const modelRows=(()=>{
    const probeFs=Math.min(w,h)*.12;
    if (textWidth(config.model,modelFont,'heavy',probeFs)<=textCol) return [config.model];
    const cut=config.model.lastIndexOf('-');
    return cut>0&&cut<config.model.length-1
      ? [config.model.slice(0,cut+1),config.model.slice(cut+1)]
      : [config.model];
  })();
  const modelBlock=1+(modelRows.length-1)*MODEL_PITCH;
  const subStack=logoToModel+modelBlock+STACK.gapModel+STACK.subCap*(1+(rows.length-1)*STACK.subPitch);
  let C, logoHt;
  if (wide) {
    // Logo is STACK.logoHWide × C; one scale fits the whole block.
    const logoWPer=STACK.logoHWide/LOGO_RATIO*(1+REG_EXTRA);
    C=Math.min((h-2*padY)/(STACK.logoHWide+subStack), textCol/logoWPer, h*.25);
    logoHt=STACK.logoHWide*C;
  } else {
    // Logo spans the panel width; type scale follows the panel, not the length
    // of the SKU. A long model is fitted (or hyphen-wrapped) inside the column.
    logoHt=Math.min((w-2*padX)*LOGO_RATIO/(1+REG_EXTRA), h*.17);
    C=Math.min((h-2*padY-logoHt)/subStack, h*.15, logoHt/STACK.logoHSquare);
  }
  const top=(h-logoHt-subStack*C)/2, left=padX;
  const logoW=logoHt/LOGO_RATIO, logoBottom=top+logoHt;
  // Category shares the model column, so the drawing keeps its space on narrow panels.
  const subCap=Math.min(STACK.subCap*C,textCol/subWPerCap,wide?Infinity:C*.455);
  const modelBase=logoBottom+logoToModel*C+C;
  const subFs=subCap/capHeight(categoryFont,'medium',1);
  const modelFs=fitSize(modelRows.reduce((a,b)=>textWidth(a,modelFont,'heavy',1)>=textWidth(b,modelFont,'heavy',1)?a:b),modelFont,'heavy',C/capHeight(modelFont,'heavy',1),textCol);
  const modelWidth=Math.max(...modelRows.map(row=>textWidth(row,modelFont,'heavy',modelFs)));
  const lastModelBase=modelBase+(modelRows.length-1)*MODEL_PITCH*C;
  const subBase=lastModelBase+STACK.gapModel*C+subCap;
  const textRight=left+Math.max(modelWidth,subWPerCap*subCap);
  const ruleW=logoW*RULE.widthRatio, ruleY=logoBottom+RULE.gapBefore*C;
  const ruleStroke=Math.max(.1,C*RULE.thickness);
  // Product art sits close to the right/bottom trim, much tighter than the copy
  // margin. On near-square faces it is anchored to the bottom-right corner.
  const artPadX=Math.max(.5,Math.min(w,h)*.04), artPadY=Math.max(.5,Math.min(w,h)*.05);
  const artGap=Math.min(w,h)*.015;
  const art=ASSETS[CATEGORY[config.category].illustration];
  const ax0=Math.max(textRight+artGap,wide?left+logoW*(1+REG_EXTRA)+artGap:0), ax1=w-artPadX;
  const ay0=wide?artPadY:logoBottom+artGap, ay1=h-artPadY;
  const k=Math.max(0,Math.min((ax1-ax0)/art.width,(ay1-ay0)/art.height));
  const aw=art.width*k, ah=art.height*k;
  const artX=ax1-aw, artY=wide?ay0+(ay1-ay0-ah)/2:ay1-ah;
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}" overflow="hidden" data-layout="${profile}" data-template="si15c-master">
    ${precisionWatermark(w,h)}
    ${productPic(config.category,artX,artY,aw,ah)}
    ${logo(left,top,logoW,{font:modelFont})}
    ${line(left,ruleY,left+ruleW,ruleY,`stroke="#1a1a1a" stroke-width="${n(ruleStroke)}" data-role="front-rule" data-rule-width="${n(ruleW)}"`)}
    ${text(left,modelBase,modelRows[0],modelFs,`${fontAttrs(modelFont,'heavy')} fill="#151515" data-role="model"`)}
    ${modelRows.slice(1).map((t,i)=>text(left,modelBase+(i+1)*MODEL_PITCH*C,t,modelFs,`${fontAttrs(modelFont,'heavy')} fill="#151515" data-role="model"`)).join('')}
    ${rows.map((t,i)=>text(left,subBase+i*STACK.subPitch*subCap,t,subFs,`${fontAttrs(categoryFont,'medium')} fill="#292929" data-role="category"`)).join('')}
  </svg>`;
}

// Same original, compact back-panel icon for every carton shape.
function backArtwork(config,x,y,w,h){
  const {width,height}=ASSETS['back-panel'];
  const bw=Math.min(w*.86,h*1.25),bh=bw*height/width;
  const wide=getLayoutProfile(w,h)==='wide';
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="0 0 ${n(w)} ${n(h)}" overflow="hidden" data-layout="${wide?'wide-back':'standard-back'}" data-template="si15c-master">
    ${precisionWatermark(w,h,'back')}
    <use href="#back-panel" x="${n((w-bw)/2)}" y="${n((h-bh)/2)}" width="${n(bw)}" height="${n(bh)}" data-brand-badge="compact" data-badge-width="${n(bw)}" data-badge-height="${n(bh)}"/>
  </svg>`;
}

/**
 * Side panel: LINOX® and model in two lines, both centred on the panel's long
 * centre line. On tall panels the pair is rotated to read top-to-bottom, with
 * the logo toward the right edge, as on the reference cartons.
 */
function sideArtwork(config,x,y,w,h){
  const f=config.modelFont ?? config.font, tall=h>=w;
  const len=tall?h:w, across=tall?w:h;           // along / across the reading direction
  const pad=Math.min(len,across)*.1;
  // The wordmark leads the eye but should not dominate the narrow side panel:
  // it takes just over half the length, with the model set smaller beneath it.
  const ratio=LOGO_RATIO/(1+REG_EXTRA);           // logo height per unit total length
  const lengthShare=.58;                          // logo width (with ®) / panel length
  const modelPer=.7;                              // model cap height / logo height
  const gapPer=.55;                               // line gap / logo height
  const lh=Math.min(len*lengthShare*ratio,(across-2*pad)/(1+gapPer+modelPer));
  const logoW=lh/LOGO_RATIO, total=logoW*(1+REG_EXTRA);
  const modelFs=fitSize(config.model,f,'heavy',lh*modelPer/capHeight(f,'heavy',1),total);
  const block=lh+gapPer*lh+capHeight(f,'heavy',modelFs);
  const top=(across-block)/2, mid=len/2;
  const art=`${logo(mid-total/2,top,logoW,{font:f})}${text(mid,top+lh+gapPer*lh+capHeight(f,'heavy',modelFs),config.model,modelFs,`${fontAttrs(f,'heavy')} text-anchor="middle" fill="#151515" data-role="side-model"`)}`;
  return tall
    ? `<g transform="translate(${n(x+w)} ${n(y)}) rotate(90)" data-role="side">${art}</g>`
    : `<g transform="translate(${n(x)} ${n(y)})" data-role="side">${art}</g>`;
}

export function printArtwork(config,layout) {
  const {front,back,sideA,sideB}=layout.panels;
  return frontArtwork(config,front.x,0,front.w,front.h)
       +backArtwork(config,back.x,0,back.w,back.h)
       +sideArtwork(config,sideA.x,0,sideA.w,sideA.h)
       +sideArtwork(config,sideB.x,0,sideB.w,sideB.h);
}

function dimension(x1,y1,x2,y2,label,{vertical=false,font}={}) {
  const attrs=fontAttrs(font,'regular');
  const arrows=vertical?
    `<path d="M${n(x1-1.2)},${n(y1+2.4)}L${n(x1)},${n(y1)}L${n(x1+1.2)},${n(y1+2.4)} M${n(x1-1.2)},${n(y2-2.4)}L${n(x1)},${n(y2)}L${n(x1+1.2)},${n(y2-2.4)}"/>`:
    `<path d="M${n(x1+2.4)},${n(y1-1.2)}L${n(x1)},${n(y1)}L${n(x1+2.4)},${n(y1+1.2)} M${n(x2-2.4)},${n(y2-1.2)}L${n(x2)},${n(y2)}L${n(x2-2.4)},${n(y2+1.2)}"/>`;
  return `<g stroke="#111" fill="none" stroke-width=".3">${line(x1,y1,x2,y2)}${arrows}</g>`+ (vertical?
    `<text transform="translate(${n(x1-2)},${n((y1+y2)/2)}) rotate(-90)" ${attrs} fill="#151515" font-size="3.2" text-anchor="middle">${esc(label)}</text>`:
    text((x1+x2)/2,y1-1.6,label,3.2,`fill="#151515" ${attrs} text-anchor="middle"`));
}

/**
 * Export exact-unit flat print art with cut & fold separation. The
 * `presentation` style swaps the production colours (red cut / dashed cyan
 * score) for the reference look: grey board, red cut, thin pale-red folds.
 */
export function createFlatSvg(raw,{withDimensions=true,withArtwork=true,style='production',embedFonts=true}={}) {
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
    dimension(panels.front.x, bounds.minY-8, panels.front.x+config.length, bounds.minY-8,`${config.length} mm`,{font:config.font})+
    dimension(-10,0,-10,config.width,`${config.width} mm`,{vertical:true,font:config.font})+
    dimension(panels.sideA.x,bounds.maxY+8,panels.sideA.x+config.depth,bounds.maxY+8,`${config.depth} mm`,{font:config.font})
    :'';
  const title = `LINOX / ${config.model} / ${config.length} × ${config.width} × ${config.depth} mm`;
  const cutStyle=show?'stroke="#e3262f" stroke-width=".42"':'stroke="#e1243b" stroke-width=".32"';
  const creaseStyle=show?'stroke="#ec8c92" stroke-width=".22"':'stroke="#13a4c8" stroke-width=".28" stroke-dasharray="1.2 1.2"';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(sheetW)}mm" height="${n(sheetH)}mm" viewBox="${n(minX)} ${n(minY)} ${n(sheetW)} ${n(sheetH)}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title><desc>Parametric dieline, red cut paths, dashed cyan score/fold paths. Concept tooling, supplier validation required.</desc>
${artDefs(config,{embedFonts})}
${show?'':rect(minX,minY,sheetW,sheetH,'fill="#fff"')}
<g id="board" fill="${show?'#f5f5f4':'#fff'}">${body}</g>
<g id="print" fill="#121212">${artwork}</g>
<g id="crease" fill="none" ${creaseStyle}>${creases}</g>
<g id="cut" fill="none" ${cutStyle} stroke-linecap="round" stroke-linejoin="round">${cuts}</g>
<g id="dimensions">${dim}</g>
</svg>`;
}

/** One exportable vector drawing of front, back and side elevations. */
export function createViewsSvg(raw,{embedFonts=true}={}) {
  const c=normalizeInput(raw), {length:L,width:W,depth:H}=c;
  const gap=13, margin=19;
  const min=0,max=L+gap+L+gap+H;
  const totalW=max+margin*2,totalH=W+margin*2+13;
  const frontX=margin, backX=frontX+L+gap,sideX=backX+L+gap,topY=margin;
  const guide=`<g stroke="#111" fill="none" stroke-width=".32">${rect(frontX,topY,L,W)}${rect(backX,topY,L,W)}${rect(sideX,topY,H,W)}</g>`;
  const cap= (x,w,title)=>text(x+w/2,topY+W+8,title,3,`text-anchor="middle" ${fontAttrs(c.font,'regular')} fill="#555"`);
  const font=c.font;
  const annotations=dimension(frontX,topY-9,frontX+L,topY-9,`${L} mm`,{font})+dimension(frontX-9,topY,frontX-9,topY+W,`${W} mm`,{vertical:true,font})+dimension(sideX,topY-9,sideX+H,topY-9,`${H} mm`,{font});
  const art=frontArtwork(c,frontX,topY,L,W)+backArtwork(c,backX,topY,L,W)+sideArtwork(c,sideX,topY,H,W);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(totalW)}mm" height="${n(totalH)}mm" viewBox="0 0 ${n(totalW)} ${n(totalH)}" role="img" aria-label="${esc(c.model)} three printed views">${artDefs(c,{embedFonts})}${rect(0,0,totalW,totalH,'fill="white"')}${guide}<g>${art}</g>${annotations}${cap(frontX,L,'FRONT')}${cap(backX,L,'BACK')}${cap(sideX,H,'SIDE')}</svg>`;
}

/** Closed-carton isometric vector preview, projection calculated from dimensions. */
export function createIsoSvg(raw,{embedFonts=true}={}) {
  const c=normalizeInput(raw), {length:L,width:W,depth:H}=c;
  const pad=19, dx=H*.76,dy=-H*.39;
  const x=pad,y=pad+H*.39;
  const pageW=L+dx+pad*2,pageH=W+H*.39+pad*2;
  const poly=points=>`<polygon points="${points.map(p=>p.map(n).join(',')).join(' ')}"/>`;
  const front=frontArtwork(c,x,y,L,W);
  const side=`<g transform="matrix(${n(dx/H)} ${n(dy/H)} 0 1 ${n(x+L)} ${n(y)})">${sideArtwork(c,0,0,H,W)}</g>`;
  const font=c.font;
  const frontGuide=dimension(x,y+W+10,x+L,y+W+10,`${L} mm`,{font});
  const vertGuide=dimension(x-10,y,x-10,y+W,`${W} mm`,{vertical:true,font});
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(pageW)}mm" height="${n(pageH+10)}mm" viewBox="0 0 ${n(pageW)} ${n(pageH+10)}" role="img" aria-label="${esc(c.model)} 3D closed carton illustration">${artDefs(c,{embedFonts})}
  <g fill="#f4f4f4" stroke="#999" stroke-width=".28">${poly([[x,y],[x+dx,y+dy],[x+L+dx,y+dy],[x+L,y]])}</g>
  <g fill="#e6e6e6" stroke="#999" stroke-width=".28">${poly([[x+L,y],[x+L+dx,y+dy],[x+L+dx,y+W+dy],[x+L,y+W]])}</g>
  <g fill="white" stroke="#888" stroke-width=".28">${rect(x,y,L,W)}</g>
  ${front}${side}${frontGuide}${vertGuide}
  ${text(x+L+dx*.5+2,y+dy*.5-2,`${H} mm`,Math.max(1.8,Math.min(3,H*.2)),`fill="#555" ${fontAttrs(font,'regular')} text-anchor="start"`)}
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
