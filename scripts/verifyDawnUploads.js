import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';
import { getYouTubeConfig } from '../src/youtube/config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));
const config = getYouTubeConfig({ channel: 'dawn-verse' });
const auth = await getAuthorizedClient('dawn-verse');
await verifyAuthorizedChannel(auth, config.channelId);
const history = JSON.parse(await readFile(config.historyPath, 'utf8'));
const youtube = google.youtube({ version: 'v3', auth });
const response = await youtube.videos.list({
  part: ['snippet', 'status'],
  id: history.map((item) => item.youtubeVideoId),
});
const byId = new Map(response.data.items?.map((item) => [item.id, item]) || []);
let failed = 0;
for (const entry of history) {
  const video = byId.get(entry.youtubeVideoId);
  const description = video?.snippet?.description || '';
  const publishAt = video?.status?.publishAt
    ? DateTime.fromISO(video.status.publishAt).setZone(config.timezone).toFormat('yyyy-LL-dd HH:mm')
    : null;
  const checks = {
    found: Boolean(video),
    scheduledAtFive: publishAt?.endsWith('05:00') || false,
    privateUntilPublish: video?.status?.privacyStatus === 'private',
    hasFullTranscript: description.includes('🎙️ 영상 자막 전체'),
    hasBibleText: description.includes('📖 오늘의 성경 말씀'),
    hasContext: description.includes('🕊️ 본문 문맥과 오늘의 적용'),
    tags: video?.snippet?.tags?.length || 0,
  };
  const pass = Object.entries(checks).every(([key, value]) => key === 'tags' ? value >= 10 : value === true);
  if (!pass) failed++;
  console.log(JSON.stringify({
    contentId: entry.contentId,
    videoId: entry.youtubeVideoId,
    publishAt,
    title: video?.snippet?.title,
    ...checks,
    pass,
  }));
}
if (failed) throw new Error(`YouTube 최종 검증 실패: ${failed}편`);
console.log(`✓ YouTube 예약·설명·태그 검증 완료: ${history.length}편`);
