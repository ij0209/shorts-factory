import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { access, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadAllContents } from '../src/content/loadContents.js';
import { validateGeneratedContent } from '../src/content/contentSchema.js';
import { getContentProfile } from '../src/contentTypes/profiles.js';
import { trackingUrlForContent } from '../src/youtube/tracking.js';
import { buildUploadPlan } from '../src/youtube/scheduleVideos.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Round 2 후보 20개가 12/8로 분리되고 배경이 준비됐다', async () => {
  const allContents = await loadAllContents(rootDir);
  const contents = allContents.filter((content) => content.experimentId === 'wmv-round2-dual-track');
  assert.equal(contents.length, 20);
  assert.equal(contents.filter((content) => content.contentTrack === 'announcement').length, 12);
  assert.equal(contents.filter((content) => content.contentTrack === 'creator_tts').length, 8);
  assert(contents.every((content) => content.youtubeUpload === true));
  assert(contents.every((content) => validateGeneratedContent(content).length === 0));
  assert(contents.some((content) => content.hookType === 'broadcast_first'));
  const backgrounds = contents.map(({ backgroundCategory, category, background }) => path.join(rootDir, 'assets', 'backgrounds', backgroundCategory || category, background));
  assert.equal(new Set(backgrounds).size, 20);
  await Promise.all(backgrounds.map((file) => access(file)));
  const longformDir = path.join(rootDir, 'contents', 'longform');
  const longforms = await Promise.all((await readdir(longformDir)).filter((file) => file.endsWith('.json'))
    .map(async (file) => JSON.parse(await readFile(path.join(longformDir, file), 'utf8'))));
  const normalize = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();
  const prior = [...allContents.filter((content) => content.experimentId !== 'wmv-round2-dual-track'), ...longforms];
  for (const content of contents) {
    assert(!prior.some((item) => normalize(item.title) === normalize(content.title)), `중복 제목: ${content.title}`);
    assert(!prior.some((item) => normalize(item.narration) === normalize(content.narration)), `중복 원고: ${content.id}`);
  }
});

test('Creator TTS는 별도 음성·렌더 설정과 홈페이지 전환 경로를 사용한다', () => {
  const creator = { id: 'sample', contentType: 'creator_tts', contentTrack: 'creator_tts', category: 'creator' };
  assert.equal(getContentProfile(creator).audioStart, 2);
  assert.equal(getContentProfile({ id: 'legacy' }).id, 'announcement');
  assert.equal(getContentProfile({ contentType: 'life-margin' }).id, 'life-margin');
  assert.match(trackingUrlForContent(creator), /^https:\/\/wemakevoice\.com\/\?/);
  assert.match(trackingUrlForContent({ ...creator, experimentId: 'wmv-round2-dual-track' }), /^https:\/\/www\.wemakevoice\.com\/freetts\?/);
  assert.match(trackingUrlForContent({ id: 'ann', contentTrack: 'announcement', experimentId: 'wmv-round2-dual-track' }), /^https:\/\/www\.wemakevoice\.com\/announcementsystem\?/);
});

test('Round 2만 분리해 업로드 계획을 세울 수 있다', async () => {
  const result = await buildUploadPlan({ experimentId: 'wmv-round2-dual-track', channel: 'wemakevoice' });
  assert.equal(result.plan.length, 0);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.skipped.length, 20);
  assert(result.skipped.every(({ reason }) => reason === 'Already uploaded'));
});
