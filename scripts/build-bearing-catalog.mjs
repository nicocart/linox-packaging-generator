// Regenerates src/bearing-catalog.js from the product model data in
// ../linox-astro. Only the three packaging categories are included.
//
// Usage: node scripts/build-bearing-catalog.mjs [path-to-linox-astro]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../linox-astro'));
const modelsDir = path.join(root, 'src/data/product-models');
const productsDir = path.join(root, 'src/data/products');
const read = name => JSON.parse(fs.readFileSync(path.join(modelsDir, name), 'utf8'));
const readCsv = name => {
  const text = fs.readFileSync(path.join(productsDir, name), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = (rows.shift() ?? []).map(cell => cell.trim());
  return rows.filter(cells => cells.some(Boolean)).map(cells =>
    Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? '').trim()])));
};

const compact = value => String(value ?? '').replace(/\s+/g, '').toUpperCase();
const round = value => Math.round((Number(value) + 1e-9) * 100) / 100;
const dimsOk = (l, w, h) => [l, w, h].every(value => Number.isFinite(value) && value >= 5 && value <= 597);
const threadMajor = value => {
  const match = String(value ?? '').match(/M\s*([0-9.]+)/i);
  return match ? Number(match[1]) : null;
};
const optionalInch = value => {
  const text = String(value ?? '').trim();
  return text === '' ? null : Number(text) * 25.4;
};
const maxOf = values => Math.max(...values.filter(value => Number.isFinite(value)));

const entries = [];
const seen = new Set();
const add = (category, source, l, w, h, legacy = null) => {
  const display = String(source.seoPrimaryDesignation ?? source.designation ?? '').trim();
  const model = compact(display);
  if (!model) return;
  if (!dimsOk(l, w, h)) return;
  const key = `${category}:${model}`;
  if (seen.has(key)) return;
  seen.add(key);
  const raw = { length: round(l), width: round(w), depth: round(h) };
  const sorted = [raw.length, raw.width, raw.depth].sort((a, b) => b - a);
  const entry = {
    model,
    display,
    category,
    series: source.series ?? '',
    length: sorted[0],
    width: sorted[1],
    depth: sorted[2],
    source: 'data',
  };
  if (legacy) entry.legacy = { length: round(legacy.length), width: round(legacy.width), depth: round(legacy.depth) };
  // Preserve the pre-sort values so rows saved by the previous build can migrate.
  if (raw.length !== entry.length || raw.width !== entry.width || raw.depth !== entry.depth) entry.unsorted = raw;
  entries.push(entry);
};

for (const item of read('rod-ends.json')) {
  if (item.data_status !== 'READY') continue;
  // Width is the largest of thread major diameter, B and W; d2 remains the
  // third dimension so the head diameter is still represented.
  const length=item.l2_mm ?? item.l4_mm;
  const width=maxOf([threadMajor(item.thread),item.B_mm,item.W_mm]);
  add('rod', item, length, width, item.d2_mm, {
    length,
    width: item.d2_mm,
    depth: item.W_mm ?? item.B_mm,
  });
}
// PHSB/POSB are maintained in the inch-series CSV rather than the metric JSON.
for (const row of readCsv('rod-ends/inch-series.csv')) {
  const length=optionalInch(row['Overall Length L (in)']);
  const ball=optionalInch(row['Ball Diameter d2 (in)']);
  const b=optionalInch(row['Width B (in)']);
  const width=maxOf([
    optionalInch(row['Thread Major Diameter d3 (in)']),
    b,
    optionalInch(row['Shank Diameter S (in)']),
  ]);
  add('rod', { designation: row.Model, series: 'PHSB / POSB (inch)' },
    length, width, ball, { length, width: ball, depth: b });
}
for (const item of read('spherical-plain-bearings.json')) {
  if (item.data_status !== 'READY') continue;
  // Radial spherical plain bearings: outside diameter × outside diameter × width.
  add('radial', item, item.D_mm, item.D_mm, item.B_mm);
}
for (const item of read('stainless-steel-ball-bearings.json')) {
  if (item.data_status !== 'READY' || item.subseries_slug !== 'deep-groove') continue;
  add('deep', item, item.D_mm, item.D_mm, item.B_mm);
}

const order = { rod: 0, radial: 1, deep: 2 };
entries.sort((a, b) => order[a.category] - order[b.category]
  || a.model.localeCompare(b.model, 'en', { numeric: true })
  || a.model.localeCompare(b.model));

const out = new URL('../src/bearing-catalog.js', import.meta.url);
fs.writeFileSync(out, `// Generated by scripts/build-bearing-catalog.mjs. Do not edit by hand.\n`
  + `// Source: linox-astro/src/data/product-models + src/data/products/rod-ends/inch-series.csv\n`
  + `export const BEARING_CATALOG = Object.freeze(${JSON.stringify(entries, null, 0)});\n`);

const counts = entries.reduce((all, entry) => ({ ...all, [entry.category]: (all[entry.category] ?? 0) + 1 }), {});
console.log(`Wrote ${entries.length} models to ${out.pathname}`);
console.log(counts);
