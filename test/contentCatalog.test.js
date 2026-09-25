import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentCatalog, loadLongformContents, loadShortContents } from '../src/content/contentCatalog.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('분산된 콘텐츠 소스를 하나의 중복 없는 카탈로그로 읽는다', async () => {
  const entries = await loadContentCatalog(rootDir);
  assert.ok(entries.length > 100);
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length);
  assert.ok(entries.some(({ sourceKind }) => sourceKind === 'longform'));
  assert.ok(entries.some(({ sourceFile }) => sourceFile.includes('DAWN_VERSE_ROUND_1B')));
});

test('기존 숏츠 로더와 롱폼 로더의 책임을 분리한다', async () => {
  const [shorts, longforms] = await Promise.all([loadShortContents(rootDir), loadLongformContents(rootDir)]);
  assert.ok(longforms.length >= 5);
  const shortIds = new Set(shorts.map(({ id }) => id));
  assert.ok(longforms.every(({ id }) => !shortIds.has(id)));
  assert.ok(longforms.some(({ id }) => id === 'wemakevoice-longform-camping-checkout-001'));
});
