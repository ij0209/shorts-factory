import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getYouTubeConfig } from '../src/youtube/config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));
const config = getYouTubeConfig({ channel: 'dawn-verse' });
const history = JSON.parse(await readFile(config.historyPath, 'utf8'));
if (!history.length) {
  console.log('취소할 새벽한구절 업로드가 없습니다.');
  process.exit(0);
}
const auth = await getAuthorizedClient('dawn-verse');
const channel = await verifyAuthorizedChannel(auth, config.channelId);
if (channel.title.replaceAll(/\s/g, '') !== '새벽한구절') {
  throw new Error(`채널명이 일치하지 않습니다: ${channel.title}`);
}
const youtube = google.youtube({ version: 'v3', auth });
for (const item of history) {
  try {
    await youtube.videos.delete({ id: item.youtubeVideoId });
    console.log(`✓ 예약 취소·영상 삭제 ${item.contentId} ${item.youtubeVideoId}`);
  } catch (error) {
    if (error.code === 404 || error.response?.status === 404) {
      console.log(`✓ 이미 삭제됨 ${item.contentId} ${item.youtubeVideoId}`);
    } else throw error;
  }
}
let remaining = [];
for (let attempt = 1; attempt <= 5; attempt++) {
  const check = await youtube.videos.list({
    part: ['id'],
    id: history.map((item) => item.youtubeVideoId),
  });
  remaining = check.data.items?.map((item) => item.id) || [];
  if (!remaining.length) break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (remaining.length) throw new Error(`삭제 확인 실패: ${remaining.join(', ')}`);
const stamp = DateTime.now().setZone(config.timezone).toFormat('yyyyLLdd-HHmmss');
const archive = path.join(root, 'data', `youtube-upload-history-dawn-verse-cancelled-${stamp}.json`);
const cancelledAt = DateTime.now().setZone(config.timezone).toISO();
await writeFile(archive, JSON.stringify(history.map((item) => ({ ...item, status: 'cancelled', cancelledAt })), null, 2) + '\n');
await writeFile(config.historyPath, '[]\n');
console.log(`✓ 취소 기록 보관: ${archive}`);
