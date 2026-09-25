import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { google } from 'googleapis';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getYouTubeConfig } from '../src/youtube/config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));
const profile = JSON.parse(await readFile(path.join(root, 'projects/dawn_verse/channel_profile.json'), 'utf8'));
const config = getYouTubeConfig({ channel: 'dawn-verse' });
const auth = await getAuthorizedClient('dawn-verse');
const verified = await verifyAuthorizedChannel(auth, config.channelId);
if (verified.title.replaceAll(/\s/g, '') !== '새벽한구절') {
  throw new Error(`채널명이 일치하지 않습니다: ${verified.title}`);
}
const youtube = google.youtube({ version: 'v3', auth });
const current = await youtube.channels.list({
  part: ['brandingSettings'],
  id: [config.channelId],
});
const channel = current.data.items?.[0];
if (!channel) throw new Error('새벽한구절 채널 정보를 찾지 못했습니다.');
await youtube.channels.update({
  part: ['brandingSettings'],
  requestBody: {
    id: config.channelId,
    brandingSettings: {
      ...channel.brandingSettings,
      channel: {
        ...channel.brandingSettings?.channel,
        description: profile.about,
      },
    },
  },
});
const checked = await youtube.channels.list({
  part: ['brandingSettings', 'snippet'],
  id: [config.channelId],
});
const updated = checked.data.items?.[0];
if (updated?.brandingSettings?.channel?.description !== profile.about) {
  throw new Error('채널 소개 저장 결과가 로컬 프로필과 일치하지 않습니다.');
}
console.log(`✓ ${updated.snippet?.title} (${updated.id}) 채널 소개 업데이트 완료`);
console.log(profile.about);
