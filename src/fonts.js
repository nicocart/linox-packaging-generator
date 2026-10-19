import { METRICS } from './font-metrics.js';

/**
 * Print typefaces offered for carton artwork. All are OFL / Apache licensed
 * (assets/fonts/*-LICENSE.txt) and are embedded into exported SVG, so the
 * result never depends on fonts installed on the viewing computer.
 * Each family supplies three roles: regular text, medium labels, heavy model.
 */
export const FONTS = Object.freeze({
  barlow: { label: 'Barlow', note: 'DIN 风格 · 工业感', weights: { regular: 400, medium: 600, heavy: 800 } },
  'barlow-semi-condensed': { label: 'Barlow Semi Condensed', note: 'DIN 窄体 · 适合长型号', weights: { regular: 400, medium: 600, heavy: 800 } },
  arimo: { label: 'Arimo', note: '与 Arial / Helvetica 同宽', weights: { regular: 400, medium: 600, heavy: 700 } },
  roboto: { label: 'Roboto', note: '通用无衬线', weights: { regular: 400, medium: 500, heavy: 900 } },
  'source-sans-3': { label: 'Source Sans 3', note: '人文无衬线 · 小字清晰', weights: { regular: 400, medium: 600, heavy: 900 } },
  archivo: { label: 'Archivo', note: 'Grotesk · 宽厚稳重', weights: { regular: 400, medium: 600, heavy: 800 } },
  montserrat: { label: 'Montserrat', note: '几何无衬线', weights: { regular: 400, medium: 600, heavy: 800 } },
  oswald: { label: 'Oswald', note: '高窄标题体', weights: { regular: 400, medium: 500, heavy: 700 } },
});
export const DEFAULT_FONT = 'barlow-semi-condensed';
/** Brand typography is fixed: model uses Barlow Semi Condensed, category Barlow. */
export const MODEL_FONT = 'barlow-semi-condensed';
export const CATEGORY_FONT = 'barlow';

const familyName = key => `LINOX ${FONTS[key].label}`;
const weightOf = (key, role) => FONTS[key].weights[role];

/** SVG presentation attributes for one text role, fallback kept generic. */
export function fontAttrs(key, role = 'regular') {
  return `font-family="'${familyName(key)}',sans-serif" font-weight="${weightOf(key, role)}"`;
}

/** Advance width of `str` at `size`; non-ASCII glyphs count as an average glyph. */
export function textWidth(str, key, role, size) {
  const { adv } = METRICS[key][weightOf(key, role)];
  let units = 0;
  for (const ch of String(str)) {
    const code = ch.codePointAt(0);
    units += code >= 32 && code < 127 ? adv[code - 32] : adv[53]; // 'U'
  }
  return units / 1000 * size;
}
export const capHeight = (key, role, size) => METRICS[key][weightOf(key, role)].cap / 1000 * size;
/** Largest size ≤ `size` at which `str` fits in `maxWidth`. */
export const fitSize = (str, key, role, size, maxWidth) => Math.min(size, maxWidth / Math.max(1e-6, textWidth(str, key, role, 1)));

const fontFile = (key, weight) => `${key}-${weight}.woff2`;
const files = key => Object.values(FONTS[key].weights).map(weight => ({ weight, file: fontFile(key, weight) }));

/** @font-face rules loading from `baseUrl` (the live page uses the font files directly). */
export function fontFaceUrlCss(key, baseUrl = './assets/fonts/') {
  return files(key).map(({ weight, file }) =>
    `@font-face{font-family:'${familyName(key)}';font-weight:${weight};src:url(${baseUrl}${file}) format('woff2')}`).join('');
}

// Base64 font files, filled by loadFontData() in the browser or by Node callers.
const embedded = new Map();
export function registerFontData(key, weight, base64) { embedded.set(fontFile(key, weight), base64); }
export const hasFontData = key => files(key).every(({ file }) => embedded.has(file));

/** Self-contained @font-face rules for exported files. */
export function fontFaceEmbedCss(key) {
  if (!hasFontData(key)) throw new Error(`字体 ${FONTS[key].label} 尚未加载，无法内嵌到导出文件`);
  return files(key).map(({ weight, file }) =>
    `@font-face{font-family:'${familyName(key)}';font-weight:${weight};src:url(data:font/woff2;base64,${embedded.get(file)}) format('woff2')}`).join('');
}

/** All distinct families a normalized config renders with. */
export function fontKeysFor(config) {
  return [...new Set([config.font, config.modelFont, config.categoryFont].filter(Boolean))];
}

/** @font-face rules for every family in a config, embedded or URL-based. */
export const fontFaceEmbedCssFor = config => fontKeysFor(config).map(fontFaceEmbedCss).join('');
export const fontFaceUrlCssFor = (config, baseUrl = './assets/fonts/') =>
  fontKeysFor(config).map(key => fontFaceUrlCss(key, baseUrl)).join('');

/** Browser: fetch every family's woff2 files once so exports can embed them. */
export async function loadFontDataFor(config, baseUrl = './assets/fonts/') {
  await Promise.all(fontKeysFor(config).map(key => loadFontData(key, baseUrl)));
}

/** Browser: fetch the family's woff2 files once so exports can embed them. */
export async function loadFontData(key, baseUrl = './assets/fonts/') {
  await Promise.all(files(key).filter(({ file }) => !embedded.has(file)).map(async ({ weight, file }) => {
    const res = await fetch(baseUrl + file);
    if (!res.ok) throw new Error(`字体文件加载失败：${file}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    registerFontData(key, weight, btoa(bin));
  }));
}
