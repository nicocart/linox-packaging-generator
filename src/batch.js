import { normalizeInput } from './geometry.js';

/** Category spellings accepted in pasted batch rows. */
const CATEGORY_ALIASES = Object.freeze({
  rod: ['rod', 'rod end', 'rodend', '杆端', '杆端关节轴承', '杆端轴承'],
  radial: ['radial', 'radial spherical', 'spherical', 'spherical plain', 'plain', '向心', '向心关节轴承', '关节轴承'],
  deep: ['deep', 'deep groove', 'deep groove ball', 'groove', '深沟', '深沟球', '深沟球轴承'],
});

const clean = value => String(value ?? '').trim().replace(/^["']|["']$/g, '');
const amount = value => Number(clean(value).replace(/mm$/i, '').trim());

/** Resolve 杆端 / 向心 / 深沟, Rod End / Radial / Deep Groove, or rod/radial/deep. */
export function resolveCategory(value) {
  const text = clean(value).toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES))
    if (aliases.some(alias => text === alias || text.includes(alias))) return key;
  return null;
}

function isHeader(cells) {
  const first = cells[0]?.toLowerCase();
  const second = cells[1]?.toLowerCase();
  return ['型号', 'model', 'sku', '产品', '产品型号'].includes(first)
    || ['分类', 'category', '产品分类'].includes(second);
}

/**
 * Parse one row per line: 型号, 分类, 长, 宽, 高, 余量(可选).
 * Rows use product dimensions and product mode; the allowance defaults to 3 mm.
 * Comments (#) and an optional header are ignored. Invalid rows are reported
 * separately so a batch can still export its valid rows.
 */
export function parseBatch(text, { allowance = 3 } = {}) {
  const defaultAllowance = Number(allowance);
  const items = [], errors = [];
  String(text ?? '').split(/\r?\n/).forEach((source, index) => {
    const line = source.trim();
    if (!line || line.startsWith('#')) return;
    const cells = line.split(/[,，;\t]+/).map(clean);
    if (isHeader(cells)) return;
    const lineNo = index + 1;
    if (cells.length < 5) {
      errors.push({ line: lineNo, source, message: '至少需要 5 列：型号、分类、长、宽、高' });
      return;
    }
    const [model, categoryText, length, width, depth, allowanceCell] = cells;
    const category = resolveCategory(categoryText);
    if (!category) {
      errors.push({ line: lineNo, source, message: `不支持的分类：${categoryText || '（空）'}` });
      return;
    }
    const raw = {
      model,
      category,
      length: amount(length),
      width: amount(width),
      depth: amount(depth),
      mode: 'product',
      allowance: allowanceCell === undefined || allowanceCell === '' ? defaultAllowance : amount(allowanceCell),
    };
    try {
      items.push({ line: lineNo, source, raw, conf: normalizeInput(raw) });
    } catch (error) {
      errors.push({ line: lineNo, source, message: error.message });
    }
  });
  return { items, errors, defaultAllowance };
}
