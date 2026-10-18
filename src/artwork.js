import { createDieline, CATEGORY, normalizeInput } from './geometry.js';

/** SVG is entirely procedural. No AI/image assets or external font/network dependencies. */
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const n = value => +value.toFixed(3);
const line = (x1,y1,x2,y2,other='') => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${other}/>`;
const rect = (x,y,w,h,other='') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" ${other}/>`;
const text = (x,y,str,fs,other='') => `<text x="${n(x)}" y="${n(y)}" font-size="${n(fs)}" ${other}>${esc(str)}</text>`;

export const defs = `<defs>
<symbol id="pic-rod" viewBox="0 0 205 120">
  <g fill="none" stroke="#222" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M11 46 L75 46 L105 24 L122 27 L102 63 L75 70 L11 70Z"/><path d="M17 49L69 49L89 36M17 67L70 67L97 56"/>
    <circle cx="146" cy="55" r="46"/><circle cx="146" cy="55" r="35"/><circle cx="146" cy="55" r="22"/><circle cx="146" cy="55" r="18"/>
    <path d="M112 22L101 32L99 74L117 93M178 23L180 85M11 46L5 50L5 66L11 70"/>
    <path d="M15 51L28 55L28 62L15 67M21 53L21 65M35 49L35 67M44 49L44 67M53 49L53 67M62 49L62 67" stroke-width="1.2"/>
  </g>
</symbol>
<symbol id="pic-radial" viewBox="0 0 205 120">
  <g fill="none" stroke="#222" stroke-width="2.7" stroke-linejoin="round">
    <ellipse cx="111" cy="60" rx="59" ry="52"/><ellipse cx="111" cy="60" rx="45" ry="44"/>
    <ellipse cx="111" cy="60" rx="27" ry="29"/><ellipse cx="111" cy="60" rx="21" ry="24"/>
    <path d="M101 9L78 9C53 10 36 29 36 60C36 91 54 110 81 111L111 112M35 60L52 60M81 9C52 11 35 33 35 60"/>
    <path d="M153 24L170 31M153 96L170 88M58 32L72 38M58 88L72 82" stroke-width="1.5"/>
    <path d="M96 13C68 16 55 38 55 60C55 83 69 102 95 107" stroke-width="1.2"/>
  </g>
</symbol>
<symbol id="pic-deep" viewBox="0 0 205 120">
  <g fill="none" stroke="#222" stroke-width="2.7">
    <ellipse cx="116" cy="60" rx="55" ry="53"/><ellipse cx="105" cy="60" rx="55" ry="53"/>
    <ellipse cx="105" cy="60" rx="38" ry="37"/><ellipse cx="105" cy="60" rx="29" ry="28"/>
    <path d="M116 8L127 11C153 22 170 39 171 60C169 89 149 107 116 113M75 31L82 34M75 88L82 85"/>
    <path d="M104 22A38 38 0 0 0 104 98M104 30A30 30 0 0 0 104 90" stroke-width="1.2"/>
  </g>
</symbol>
</defs>`;

/** Vector tracing from the reference packaging image, not the original brand master. */
const WORDMARK_PATH = 'M167.85 0.00 L167.85 1.09 L184.96 23.87 L184.96 26.04 L167.85 48.83 L167.85 49.91 L183.33 49.91 L191.48 39.06 L191.48 37.98 L193.11 35.81 L193.93 35.81 L204.52 49.91 L219.19 49.91 L219.19 48.83 L202.07 26.04 L202.07 24.96 L206.15 19.53 L206.15 18.45 L219.19 1.09 L219.19 0.00 L203.70 0.00 L193.93 14.11 L193.11 14.11 L192.30 11.94 L183.33 0.00 Z M121.41 2.17 L121.41 11.94 L120.59 13.02 L120.59 16.28 L121.41 17.36 L121.41 26.04 L120.59 27.13 L120.59 35.81 L121.41 36.89 L121.41 44.49 L124.67 48.83 L126.30 49.91 L164.59 49.91 L154.81 36.89 L153.19 35.81 L133.63 35.81 L132.00 33.64 L132.00 15.19 L127.93 9.77 L128.74 8.68 L129.56 8.68 L133.63 14.11 L153.19 14.11 L154.81 16.28 L154.81 33.64 L165.41 47.74 L166.22 47.74 L166.22 5.43 L163.78 1.09 L162.15 1.09 L161.33 0.00 L123.04 0.00 L123.04 1.09 L127.93 7.60 L127.11 8.68 L126.30 8.68 Z M105.93 0.00 L105.93 27.13 L107.56 28.21 L117.33 41.23 L117.33 0.00 Z M67.63 0.00 L67.63 49.91 L79.85 49.91 L79.85 21.70 L80.67 20.62 L81.48 20.62 L103.48 49.91 L120.59 49.91 L120.59 48.83 L111.63 36.89 L110.81 36.89 L82.30 0.00 Z M50.52 0.00 L50.52 48.83 L51.33 49.91 L63.56 49.91 L63.56 0.00 Z M0.00 0.00 L0.00 49.91 L46.44 49.91 L47.26 48.83 L47.26 35.81 L46.44 34.72 L13.85 34.72 L13.04 33.64 L13.04 1.09 L12.22 0.00 Z';
export function logo(x,y,w,{color='#c90012',registered=true}={}) {
  const height=w*0.232;
  const xscale=w/220, yscale=height/51;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(xscale)} ${n(yscale)})" fill="${color}">
    <path d="${WORDMARK_PATH}" fill-rule="evenodd"/>
    ${registered?'<circle cx="226" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="226" y="9.2" font-size="6.7" fill="currentColor" text-anchor="middle">R</text>':''}
  </g>`;
}

function productPic(category,x,y,w,h){ return `<use href="#pic-${CATEGORY[category].illustration}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`; }

function frontArtwork(config,x,y,w,h) {
  const model=esc(config.model);
  const category=CATEGORY[config.category];
  const pad=Math.max(1.25,Math.min(3.2,h*0.075));
  const wide=w/h>2.35;
  const logoW=wide?Math.min(w*0.41,h*2.85):w*0.78;
  const logoH=logoW*0.232;
  const logoY=y+pad;
  const modelSize=wide?Math.min(h*.265,w*.18,(w*.37)/(config.model.length*.58)):Math.min(h*.19,w*.17,(w*.55)/(config.model.length*.62));
  const modelY=y+(wide? h*.73:h*.71);
  let art = `<g>` + logo(x+pad,logoY,logoW,{registered:false});
  if(wide){
    art+=line(x+pad,y+h*.44,x+Math.min(w*.33,logoW),y+h*.44,'stroke="#222" stroke-width=".33"');
    art+=text(x+pad,modelY,model,modelSize,'font-family="Arial,Helvetica,sans-serif" font-weight="800" fill="#151515"');
    art+=line(x+pad,y+h*.80,x+Math.min(w*.3,logoW),y+h*.80,'stroke="#222" stroke-width=".25"');
    art+=text(x+pad,y+h*.94,category.label,Math.max(1.8,Math.min(3.4,h*.12)),'font-family="Arial,Helvetica,sans-serif" fill="#252525"');
    art+=productPic(config.category,x+w*.48,y+h*.19,w*.5,h*.74);
  } else {
    art+=line(x+pad,y+h*.35,x+w*.40,y+h*.35,'stroke="#222" stroke-width=".27"');
    art+=text(x+pad,modelY,model,modelSize,'font-family="Arial,Helvetica,sans-serif" font-weight="800" fill="#151515"');
    art+=line(x+pad,y+h*.77,x+w*.42,y+h*.77,'stroke="#222" stroke-width=".26"');
    const words=category.label==='Radial Spherical Plain Bearing'?['Radial Spherical','Plain Bearing']:[category.label];
    words.forEach((item,i)=>art+=text(x+pad,y+h*(.855+i*.078),item,Math.max(1.5,Math.min(2.6,h*.083)),'font-family="Arial,Helvetica,sans-serif" fill="#252525"'));
    art+=productPic(config.category,x+w*.60,y+h*.35,w*.38,h*.60);
  }
  return art+'</g>';
}

function backArtwork(config,x,y,w,h){
  const pad=Math.max(1.4,Math.min(3.2,h*.075));
  const mw=w-2*pad,mh=h-2*pad;
  const wide=w/h>2.35;
  const lw=wide?Math.min(w*.33,h*1.1):Math.min(w*.48,h*1.1);
  const iconD=wide?Math.min(5,h*.22):Math.min(7.2,h*.24);
  const totalW=iconD+Math.max(1,w*.045)+lw;
  const startX=x+(w-totalW)/2;
  const rowY=y+pad+Math.min(1.2,h*.03);
  let out=`<g>`+rect(x+pad,y+pad,mw,mh,'rx="1.1" fill="none" stroke="#181818" stroke-width=".45"');
  out+=`<g transform="translate(${n(startX)} ${n(rowY)}) scale(${n(iconD/36)})"><circle cx="18" cy="18" r="16" stroke="#222" stroke-width="3.5" fill="none"/><circle cx="18" cy="18" r="7" stroke="#222" stroke-width="3" fill="none"/>${Array.from({length:8},(_,i)=>`<circle cx="${18+12*Math.cos(i*Math.PI/4)}" cy="${18+12*Math.sin(i*Math.PI/4)}" r="2.8" fill="#222"/>`).join('')}</g>`;
  out+=logo(startX+iconD+Math.max(1,w*.045),rowY+iconD*.16,lw,{color:'#111',registered:false});
  const baseY=y+h*.58;
  const headFs=Math.max(1.55,Math.min(w*.044,h*.145,3.5));
  out+=text(x+w*.5,baseY,'CORROSION-RESISTANT',headFs,'fill="#171717" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="800"');
  out+=text(x+w*.5,y+h*.66,'BEARINGS & MOTION COMPONENTS',Math.max(1.1,Math.min(headFs*.67,2.3)),'fill="#171717" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"');
  const smallFs=Math.max(1.2,Math.min(1.85,h*.073));
  out+=text(x+w*.5,y+h*.75,'www.linoxbearing.com',smallFs,'fill="#171717" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"');
  out+=text(x+w*.5,y+h*.82,'ISO 9001:2015',smallFs,'fill="#171717" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"');
  out+=text(x+w*.5,y+h*.89,'MADE IN CHINA',smallFs,'fill="#171717" font-family="Arial,Helvetica,sans-serif" text-anchor="middle"');
  return out+'</g>';
}

function sideArtwork(config,x,y,w,h){
  const isTall=h>=w;
  if (!isTall) return `<g>${logo(x+w*.08,y+h*.12,w*.83,{registered:false})}${text(x+w*.1,y+h*.85,config.model,Math.min(3,h*.22),'font-family="Arial,sans-serif" fill="#111" font-weight="bold"')}</g>`;
  const markW=Math.min(h*.46,w*.8);
  return `<g transform="translate(${n(x+w*.87)} ${n(y+h*.07)}) rotate(90)">${logo(0,0,markW,{registered:false})}${text(0,Math.min(markW*.51,w*.52),config.model,Math.min(3.6,w*.36),'font-family="Arial,Helvetica,sans-serif" fill="#171717" font-weight="bold"')}</g>`;
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

/** Export exact-unit flat print art with cut & fold separation. */
export function createFlatSvg(raw,{withDimensions=true,withArtwork=true}={}) {
  const config=normalizeInput(raw), layout=createDieline(raw), {panels,bounds}=layout;
  const pad=withDimensions?18:5;
  const minX=-pad,minY=bounds.minY-pad;
  const sheetW=bounds.maxX+pad*2,sheetH=bounds.maxY-bounds.minY+pad*2;
  const body=Object.values(panels).map(q=>rect(q.x,0,q.w,q.h,'fill="#fff"')).join('');
  const artwork=withArtwork?printArtwork(config,layout):'';
  const cuts=layout.cutPaths.map(d=>`<path d="${d}"/>`).join('');
  const creases=layout.creasePaths.map(d=>`<path d="${d}"/>`).join('');
  const dim=withDimensions?
    dimension(panels.front.x, bounds.minY-8, panels.front.x+config.length, bounds.minY-8,`${config.length} mm`)+
    dimension(-10,0,-10,config.width,`${config.width} mm`,{vertical:true})+
    dimension(panels.sideA.x,bounds.maxY+8,panels.sideA.x+config.depth,bounds.maxY+8,`${config.depth} mm`)
    :'';
  const title = `LINOX / ${config.model} / ${config.length} × ${config.width} × ${config.depth} mm`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n(sheetW)}mm" height="${n(sheetH)}mm" viewBox="${n(minX)} ${n(minY)} ${n(sheetW)} ${n(sheetH)}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title><desc>Parametric dieline, red cut paths, dashed cyan score/fold paths. Concept tooling, supplier validation required.</desc>
${defs}
${rect(minX,minY,sheetW,sheetH,'fill="#fff"')}
<g id="board" fill="#fff">${body}</g>
<g id="print" fill="#121212">${artwork}</g>
<g id="cut" fill="none" stroke="#e1243b" stroke-width=".32" stroke-linecap="round" stroke-linejoin="round">${cuts}</g>
<g id="crease" fill="none" stroke="#13a4c8" stroke-width=".28" stroke-dasharray="1.2 1.2">${creases}</g>
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
 const pseudo={...config};
 if(kind==='front')return frontArtwork(pseudo,0,0,w,h);
 if(kind==='back')return backArtwork(pseudo,0,0,w,h);
 return sideArtwork(pseudo,0,0,w,h);
}
export function productArtworkForPreview(category,w,h) {
 return productPic(category,0,0,w,h);
}
