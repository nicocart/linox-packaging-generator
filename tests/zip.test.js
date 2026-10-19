import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, createZipBlob } from '../src/zip.js';

test('CRC32 matches the standard test vector', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
});
test('ZIP contains local, central and end records with UTF-8 names', async () => {
  const blob = createZipBlob([
    { name: 'a.txt', data: 'hello' },
    { name: '效果图/盒子_效果图.svg', data: '<svg/>' },
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'PK\u0003\u0004');
  assert.ok(text.includes('a.txt'));
  assert.ok(text.includes('效果图/盒子_效果图.svg'));
  assert.ok(text.includes('PK\u0001\u0002'));
  assert.ok(text.includes('PK\u0005\u0006'));
  assert.ok(bytes.length > 100);
});
