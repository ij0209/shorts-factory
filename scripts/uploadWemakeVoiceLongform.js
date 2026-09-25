import path from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { DateTime } from 'luxon';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getYouTubeConfig, rootDir } from '../src/youtube/config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';
import { uploadVideo } from '../src/youtube/uploadVideo.js';
import { appendUploadHistory, loadUploadHistory } from '../src/youtube/uploadHistory.js';

const contentFile = path.join(rootDir, 'contents', 'longform', 'wemakevoice-camping-checkout-001.json');

async function main() {
  await loadEnv(path.join(rootDir, '.env'));
  const config = getYouTubeConfig({ requireOAuth: true, channel: 'wemakevoice' });
  const content = JSON.parse(await readFile(contentFile, 'utf8'));
  const date = DateTime.now().setZone(config.timezone).toFormat('yyyyLLdd');
  const baseName = `${content.id}_${date}`;
  const videoPath = path.join(rootDir, 'output', 'wemakevoice-longform', `${baseName}.mp4`);
  await access(videoPath);

  const history = await loadUploadHistory(config.historyPath);
  const existing = history.find(({ contentId }) => contentId === content.id);
  if (existing) {
    console.log(JSON.stringify({ skipped: true, reason: 'already_uploaded', ...existing }, null, 2));
    return;
  }

  const auth = await getAuthorizedClient(config.channel);
  const channel = await verifyAuthorizedChannel(auth, config.channelId);
  const video = await uploadVideo({
    auth,
    videoPath,
    title: content.youtubeTitle,
    description: content.youtubeDescription,
    tags: content.youtubeTags,
    categoryId: config.categoryId,
    privacyStatus: 'public',
    madeForKids: config.madeForKids,
  });
  const uploadedAt = DateTime.now().setZone(config.timezone).toISO();
  await appendUploadHistory(config.historyPath, {
    contentId: content.id,
    youtubeVideoId: video.id,
    uploadedAt,
    publishAt: uploadedAt,
    status: 'public',
    format: 'longform',
  });
  console.log(JSON.stringify({ channel: channel.title, channelId: channel.id, videoId: video.id, url: `https://youtu.be/${video.id}`, privacyStatus: 'public', thumbnailUploaded: false }, null, 2));
}

main().catch((error) => {
  console.error(`WeMakeVoice 롱폼 업로드 실패: ${error.message}`);
  process.exitCode = 1;
});
