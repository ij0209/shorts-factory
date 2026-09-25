import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DateTime } from 'luxon';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getYouTubeConfig, youtubeChannelForContent } from '../src/youtube/config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';
import { loadContents, validateUploadCandidate } from '../src/youtube/metadata.js';
import { appendUploadHistory, loadUploadHistory } from '../src/youtube/uploadHistory.js';
import { uploadVideo } from '../src/youtube/uploadVideo.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));
if (!process.argv.includes('--confirm')) throw new Error('실제 업로드에는 --confirm 옵션이 필요합니다.');
const config = getYouTubeConfig({ channel: 'dawn-verse' });
const history = await loadUploadHistory(config.historyPath);
const uploaded = new Set(history.map((item) => item.contentId));
const contents = (await loadContents())
  .filter((content) => youtubeChannelForContent(content) === 'dawn-verse')
  .filter((content) => content.experimentId === 'DAWN_VERSE_ROUND_1A')
  .filter((content) => !uploaded.has(content.id))
  .sort((a, b) => a.day - b.day);
if (!contents.length) {
  console.log('업로드할 새벽한구절 영상이 없습니다.');
  process.exit(0);
}
const candidates = [];
for (const content of contents) {
  const candidate = await validateUploadCandidate(content);
  if (candidate.errors.length) throw new Error(`${content.id}: ${candidate.errors.join(', ')}`);
  candidates.push(candidate);
}
const auth = await getAuthorizedClient('dawn-verse');
const channel = await verifyAuthorizedChannel(auth, config.channelId);
if (channel.title.replaceAll(/\s/g, '') !== '새벽한구절') throw new Error(`채널명이 일치하지 않습니다: ${channel.title}`);
const now = DateTime.now().setZone(config.timezone);
const firstScheduled = now.plus({ days: 1 }).startOf('day').set({
  hour: config.publishHour, minute: config.publishMinute, second: 0, millisecond: 0,
});
console.log(`YouTube 채널: ${channel.title} (${channel.id})`);
console.log(`첫 영상 즉시 공개: ${candidates[0].content.id}`);
console.log(`나머지 예약 시작: ${firstScheduled.toISO()}`);

for (let index = 0; index < candidates.length; index++) {
  const candidate = candidates[index];
  const immediate = index === 0;
  const publishAtLocal = immediate ? null : firstScheduled.plus({ days: index - 1 });
  try {
    const video = await uploadVideo({
      auth,
      videoPath: candidate.videoPath,
      title: candidate.metadata.title,
      description: candidate.metadata.description,
      tags: candidate.metadata.tags,
      publishAt: publishAtLocal?.toUTC().toISO() || null,
      categoryId: config.categoryId,
      privacyStatus: immediate ? 'public' : 'private',
      madeForKids: config.madeForKids,
    });
    await appendUploadHistory(config.historyPath, {
      contentId: candidate.content.id,
      youtubeVideoId: video.id,
      uploadedAt: DateTime.now().setZone(config.timezone).toISO(),
      publishAt: publishAtLocal?.toISO() || null,
      status: immediate ? 'public' : 'scheduled',
    });
    console.log(`✓ ${candidate.content.id} ${immediate ? '즉시 공개' : publishAtLocal.toFormat('yyyy-LL-dd HH:mm')} https://youtu.be/${video.id}`);
  } catch (error) {
    if (/exceeded the number of videos|uploadLimitExceeded/i.test(error.message)) {
      throw new Error(`${candidate.content.id}: YouTube 일일 업로드 제한이 아직 해제되지 않았습니다. 이후 영상은 시도하지 않았습니다.`);
    }
    throw error;
  }
}
