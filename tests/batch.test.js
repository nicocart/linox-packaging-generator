import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBatch, resolveCategory } from '../src/batch.js';

test('batch rows default to 3 mm allowance and accept Chinese/English categories', () => {
  const { items, errors } = parseBatch(`
    # 型号, 分类, 长, 宽, 高, 余量
    SI15C, 杆端, 80, 20, 13
    GE17C, radial, 29, 29, 13
    S6004-2RS, 深沟, 43, 43, 12, 4
  `);
  assert.equal(errors.length, 0);
  assert.equal(items.length, 3);
  assert.deepEqual([items[0].conf.length, items[0].conf.width, items[0].conf.depth], [83, 23, 16]);
  assert.equal(items[0].raw.allowance, 3);
  assert.deepEqual([items[2].conf.length, items[2].conf.width, items[2].conf.depth], [47, 47, 16]);
  assert.equal(items[2].raw.allowance, 4);
});
test('batch headers, comments, mm suffixes and category aliases are accepted', () => {
  const { items, errors } = parseBatch(`
    型号,分类,长,宽,高,余量
    X-1, Rod End, 10, 20, 30, 3mm
    X-2, 向心关节轴承, 11, 21, 31
    X-3, Deep Groove, 12, 22, 32
  `, { allowance: 2 });
  assert.equal(errors.length, 0);
  assert.deepEqual(items.map(item => item.conf.category), ['rod', 'radial', 'deep']);
  assert.deepEqual([items[1].raw.allowance, items[1].conf.length], [2, 13]);
  assert.equal(items[0].raw.allowance, 3);
});
test('invalid batch rows are reported without blocking valid rows', () => {
  const { items, errors } = parseBatch(`
    GOOD, 杆端, 10, 10, 10
    BAD-CATEGORY, 不存在, 10, 10, 10
    BAD-SIZE, 向心, 0, 10, 10
    SHORT, 深沟, 10
  `);
  assert.equal(items.length, 1);
  assert.equal(errors.length, 3);
  assert.match(errors[0].message, /分类/);
  assert.match(errors[1].message, /长宽高/);
  assert.match(errors[2].message, /5 列/);
});
test('category aliases resolve to the three supported categories', () => {
  assert.equal(resolveCategory('rod'), 'rod');
  assert.equal(resolveCategory('杆端关节轴承'), 'rod');
  assert.equal(resolveCategory('Radial Spherical Plain Bearing'), 'radial');
  assert.equal(resolveCategory('向心'), 'radial');
  assert.equal(resolveCategory('deep groove ball bearing'), 'deep');
  assert.equal(resolveCategory('深沟球轴承'), 'deep');
  assert.equal(resolveCategory('other'), null);
});
