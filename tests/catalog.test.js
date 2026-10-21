import test from 'node:test';
import assert from 'node:assert/strict';
import { BEARING_CATALOG } from '../src/bearing-catalog.js';

const counts = BEARING_CATALOG.reduce((all, entry) => {
  all[entry.category] = (all[entry.category] ?? 0) + 1;
  return all;
}, {});

test('bearing catalog contains the three packaging categories', () => {
  assert.equal(BEARING_CATALOG.length, 614);
  assert.deepEqual(counts, { rod: 186, radial: 142, deep: 286 });
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

test('existing packaging references keep their known product dimensions', () => {
  const byModel = Object.fromEntries(BEARING_CATALOG.map(entry => [entry.model, entry]));
  assert.deepEqual(
    [byModel.SI15C.length, byModel.SI15C.width, byModel.SI15C.depth, byModel.SI15C.source],
    [80, 20, 13, 'override'],
  );
  assert.deepEqual(
    [byModel.GE17C.length, byModel.GE17C.width, byModel.GE17C.depth, byModel.GE17C.source],
    [29, 29, 13, 'override'],
  );
  assert.deepEqual(
    [byModel['S6004-2RS'].length, byModel['S6004-2RS'].width, byModel['S6004-2RS'].depth, byModel['S6004-2RS'].source],
    [43, 43, 12, 'override'],
  );
});

test('rod-end catalog uses head diameter, overall length and housing width', () => {
  const sa15c = BEARING_CATALOG.find(entry => entry.model === 'SA15C');
  assert.deepEqual([sa15c.length, sa15c.width, sa15c.depth], [83, 40, 12]);
  const si5e = BEARING_CATALOG.find(entry => entry.model === 'SI5E');
  assert.deepEqual([si5e.length, si5e.width, si5e.depth], [40.5, 21, 10]);
});
