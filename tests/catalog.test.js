import test from 'node:test';
import assert from 'node:assert/strict';
import { BEARING_CATALOG } from '../src/bearing-catalog.js';

const counts = BEARING_CATALOG.reduce((all, entry) => {
  all[entry.category] = (all[entry.category] ?? 0) + 1;
  return all;
}, {});

test('bearing catalog contains the three packaging categories', () => {
  assert.equal(BEARING_CATALOG.length, 632);
  assert.deepEqual(counts, { rod: 204, radial: 142, deep: 286 });
});

test('every catalog model has finite, unique dimensions', () => {
  const keys = new Set();
  for (const entry of BEARING_CATALOG) {
    assert.ok(['rod', 'radial', 'deep'].includes(entry.category), entry.model);
    assert.match(entry.model, /^[A-Z0-9/.-]+$/);
    for (const value of [entry.length, entry.width, entry.depth]) {
      assert.ok(Number.isFinite(value) && value >= 5 && value <= 597, `${entry.model}: ${value}`);
    }
    const key = `${entry.category}:${entry.model}`;
    assert.equal(keys.has(key), false, `duplicate ${key}`);
    keys.add(key);
  }
});

test('known models use the product model dimensions as the source of truth', () => {
  const byModel = Object.fromEntries(BEARING_CATALOG.map(entry => [entry.model, entry]));
  assert.deepEqual(
    [byModel.SI15C.length, byModel.SI15C.width, byModel.SI15C.depth, byModel.SI15C.source],
    [81, 40, 21, 'data'],
  );
  assert.deepEqual(
    [byModel.GE17C.length, byModel.GE17C.width, byModel.GE17C.depth, byModel.GE17C.source],
    [30, 30, 14, 'data'],
  );
  assert.deepEqual(
    [byModel['S6004-2RS'].length, byModel['S6004-2RS'].width, byModel['S6004-2RS'].depth, byModel['S6004-2RS'].source],
    [42, 42, 12, 'data'],
  );
});

test('rod-end catalog uses head diameter, overall length and housing width', () => {
  const sa15c = BEARING_CATALOG.find(entry => entry.model === 'SA15C');
  assert.deepEqual([sa15c.length, sa15c.width, sa15c.depth], [83, 40, 12]);
  const si5e = BEARING_CATALOG.find(entry => entry.model === 'SI5E');
  assert.deepEqual([si5e.length, si5e.width, si5e.depth], [40.5, 21, 10]);
});

test('PHSB/POSB inch series is converted to millimetres', () => {
  const phsb3 = BEARING_CATALOG.find(entry => entry.model === 'PHSB3');
  assert.deepEqual([phsb3.length, phsb3.width, phsb3.depth], [35.05, 15.88, 7.92]);
  const posb16 = BEARING_CATALOG.find(entry => entry.model === 'POSB16');
  assert.deepEqual([posb16.length, posb16.width, posb16.depth], [139.7, 69.85, 34.92]);
});
