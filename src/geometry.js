/**
 * Units in this module are millimetres. Geometry is a straight-tuck-end
 * concept carton with 4 body panels, glue tab, 2 dust flaps per end and
 * opposed tuck lids. This is NOT a production-approved die until converter
 * compensation, tooling and tolerances are validated with a carton supplier.
 */
export const CATEGORY = Object.freeze({
  rod: { label: 'Rod End', illustration: 'rod', description: '杆端关节轴承' },
  radial: { label: 'Radial Spherical Plain Bearing', illustration: 'radial', description: '向心关节轴承' },
  deep: { label: 'Deep Groove Ball Bearing', illustration: 'deep', description: '深沟球轴承' },
});

export const PRESETS = Object.freeze({
  SI15C: { model: 'SI15C', category: 'rod', length: 83, width: 23, depth: 16 },
  GE17C: { model: 'GE17C', category: 'radial', length: 32, width: 32, depth: 16 },
  'S6004-2RS': { model: 'S6004-2RS', category: 'deep', length: 46, width: 46, depth: 15 },
});

export function isValidNumber(value) { return Number.isFinite(value) && value > 0; }
const round = n => +n.toFixed(4);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Convert user input into finished carton nominal exterior dimensions. */
export function normalizeInput(input) {
  const model = String(input.model ?? '').trim().toUpperCase();
  const category = input.category;
  const dims = [input.length, input.width, input.depth].map(Number);
  const allowance = Number(input.allowance ?? 2);
  if (!model || model.length > 40 || /[<>\n\r]/.test(model)) throw new Error('型号应为 1–40 个有效字符');
  if (!CATEGORY[category]) throw new Error('请选择支持的产品分类');
  if (!dims.every(v => isValidNumber(v) && v >= 8 && v <= 600)) throw new Error('长宽高必须在 8–600 mm 之间');
  if (!Number.isFinite(allowance) || allowance < 0 || allowance > 30) throw new Error('余量必须在 0–30 mm 之间');
  const sizes = input.mode === 'product' ? dims.map(v => v + allowance) : dims;
  return { model, category, length: round(sizes[0]), width: round(sizes[1]), depth: round(sizes[2]), mode: input.mode === 'product' ? 'product' : 'box', allowance };
}

/**
 * Geometry reference: panel front width L, vertical height W, carton depth H.
 * The planar blank strip is GLUE | SIDE | FRONT | SIDE | BACK.
 * Cut and crease are generated as *different* vector paths.
 */
export function createDieline(input) {
  const { length: L, width: W, depth: H } = normalizeInput(input);
  const G = round(clamp(H * 0.55, 7, 12));
  const T = round(clamp(W * 0.48, 5, H * 0.85));
  const D = round(clamp(H * 0.67, 5, H * 0.82));
  const coords = {
    glue: { x: 0, y: 0, w: G, h: W },
    sideA: { x: G, y: 0, w: H, h: W },
    front: { x: round(G+H), y: 0, w: L, h: W },
    sideB: { x: round(G+H+L), y: 0, w: H, h: W },
    back: { x: round(G+2*H+L), y: 0, w: L, h: W },
  };
  const {glue, sideA, front, sideB, back} = coords;
  const X = round(G + 2*H + 2*L);
  const s = v => round(v);
  const p = (x, y) => `${s(x)},${s(y)}`;
  const cut = [];
  const crease = [];
  const segment = (arr,x1,y1,x2,y2) => arr.push(`M${p(x1,y1)}L${p(x2,y2)}`);
  // Tab is tapered to avoid paper collisions at top/bottom.
  cut.push(`M${p(G,0)}L${p(1,2.4)}L${p(0,3.6)}L${p(0,W-3.6)}L${p(1,W-2.4)}L${p(G,W)}`);
  // Dust flaps: their bases are folds, their other three sides are cuts.
  for (const q of [sideA, sideB]) {
    cut.push(`M${p(q.x,0)}L${p(q.x+1.3,-D)}L${p(q.x+q.w-1.3,-D)}L${p(q.x+q.w,0)}`);
    cut.push(`M${p(q.x,W)}L${p(q.x+1.3,W+D)}L${p(q.x+q.w-1.3,W+D)}L${p(q.x+q.w,W)}`);
    segment(crease,q.x,0,q.x+q.w,0);
    segment(crease,q.x,W,q.x+q.w,W);
  }
  // Top front tuck end has a full depth cover and integrated tuck lip.
  const cf = round(Math.min(3, L*0.07));
  cut.push(`M${p(front.x,0)}L${p(front.x,-H)}L${p(front.x+cf,-H-T)}L${p(front.x+L-cf,-H-T)}L${p(front.x+L,-H)}L${p(front.x+L,0)}`);
  segment(crease,front.x,0,front.x+L,0);
  segment(crease,front.x,-H,front.x+L,-H);
  // Bottom back tuck closure goes in the opposite direction.
  const cb = round(Math.min(3, L*0.07));
  cut.push(`M${p(back.x,W)}L${p(back.x,W+H)}L${p(back.x+cb,W+H+T)}L${p(back.x+L-cb,W+H+T)}L${p(back.x+L,W+H)}L${p(back.x+L,W)}`);
  segment(crease,back.x,W,back.x+L,W);
  segment(crease,back.x,W+H,back.x+L,W+H);
  // Two ends without cover flap remain open cut edges.
  segment(cut,front.x,W,front.x+L,W);
  segment(cut,back.x,0,back.x+L,0);
  // Right extremity, plus 4 longitudinal folds.
  segment(cut,X,0,X,W);
  for (const x of [G,G+H,G+H+L,G+2*H+L]) segment(crease,x,0,x,W);
  return {
    input: { ...normalizeInput(input) },
    panels: coords,
    bounds: {minX: 0, minY: round(-H-T), maxX: X, maxY: round(W+H+T)},
    cutPaths: cut,
    creasePaths: crease,
    glueWidth: G, tuckDepth: T, dustDepth: D,
    notes: [
      '毫米参数对应名义成品外尺寸；刀模为工程概念稿，尚未包含纸厚/压痕/糊口公差补偿。',
      '上线生产前须由包装厂校核粘口宽度、纸板克重、插舌倒角、机械加工余量及实物试装。',
    ],
  };
}

export function assessLayout(config) {
  const { length: L, width: W, depth: H } = normalizeInput(config);
  const warnings = [];
  if (W < 18) warnings.push('正面高度偏小，建议检查字体与产品线稿可读性。');
  if (L < 30) warnings.push('正面长度偏小，标准版式可能拥挤。');
  if (H < 12) warnings.push('盒体厚度较小，侧面型号可能需要简化。');
  if (Math.min(L,W,H) < 12 || Math.max(L,W,H) > 250) warnings.push('极端盒型：请优先让包装厂校核结构强度与插舌。');
  if (config.mode === 'product') warnings.push('产品尺寸模式只按总余量增加外形尺寸；不代表已验证内部装配余量。');
  warnings.push('印前检查：LOGO 当前为可替换的矢量示意版，正式印刷请导入品牌原始 SVG。');
  return warnings;
}
