import path from 'node:path';
import { access, readFile, readdir } from 'node:fs/promises';
import { DateTime } from 'luxon';
import { loadEnv } from '../src/utils/loadEnv.js';
import { getYouTubeConfig, rootDir } from '../src/youtube/config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from '../src/youtube/auth.js';
import { uploadVideo } from '../src/youtube/uploadVideo.js';
import { appendUploadHistory, loadUploadHistory } from '../src/youtube/uploadHistory.js';

const idArg = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5) || 'life-margin-longform-children-boundaries-001';
const dateArg = process.argv.find((arg) => arg.startsWith('--date='))?.slice(7);

async function loadContent() {
  const directory = path.join(rootDir, 'contents/longform');
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    if (content.id === idArg) return content;
  }
  throw new Error(`업로드할 삶의여백 롱폼을 찾을 수 없습니다: ${idArg}`);
}

async function latestOutput(contentId, subdirectory, extension) {
  const directory = path.join(rootDir, 'output/life-margin-longform', subdirectory);
  const files = (await readdir(directory)).filter((file) => file.startsWith(`${contentId}_`) && file.endsWith(extension)).sort();
  if (!files.length) throw new Error(`출력 파일을 찾을 수 없습니다: ${contentId}`);
  return path.join(directory, files.at(-1));
}

function nextWednesdayAfter(dateTime) {
  let candidate = dateTime.plus({ days: 1 }).startOf('day');
  while (candidate.weekday !== 3) candidate = candidate.plus({ days: 1 });
  return candidate.set({ hour: 20, minute:30 });
}

async function main() {
  await loadEnv(path.join(rootDir, '.env'));
  const config = getYouTubeConfig({ requireOAuth: true, channel: 'life-margin' });
  const content = await loadContent();
  const videoPath = await latestOutput(content.id, '', '.mp4');
  await access(videoPath);
  const history = await loadUploadHistory(config.historyPath);
  const existing = history.find(({ contentId }) => contentId === content.id);
  if (existing) { console.log(JSON.stringify({ skipped:true, reason:'already_uploaded', ...existing }, null, 2)); return; }

  const scheduledLongforms = history.filter(({ format, publishAt }) => format === 'longform' && publishAt)
    .map(({ publishAt }) => DateTime.fromISO(publishAt, { zone:config.timezone })).filter(({ isValid }) => isValid);
  const baseline = scheduledLongforms.length ? DateTime.max(...scheduledLongforms) : DateTime.now().setZone(config.timezone);
  const publishAt = dateArg
    ? DateTime.fromISO(`${dateArg}T20:30:00`, { zone:config.timezone })
    : nextWednesdayAfter(baseline);
  if (!publishAt.isValid || publishAt <= DateTime.now().setZone(config.timezone)) throw new Error('예약 공개 시각은 현재보다 미래여야 합니다.');
  const auth = await getAuthorizedClient(config.channel);
  const channel = await verifyAuthorizedChannel(auth, config.channelId);
  const video = await uploadVideo({ auth, videoPath, title:content.youtubeTitle, description:content.youtubeDescription, tags:content.youtubeTags, publishAt:publishAt.toUTC().toISO(), categoryId:config.categoryId, privacyStatus:'private', madeForKids:config.madeForKids });
  const uploadedAt = DateTime.now().setZone(config.timezone).toISO();
  await appendUploadHistory(config.historyPath, { contentId:content.id, youtubeVideoId:video.id, uploadedAt, publishAt:publishAt.toISO(), status:'scheduled', format:'longform', derivedFrom:content.derivedFrom });
  console.log(JSON.stringify({ channel:channel.title, channelId:channel.id, videoId:video.id, url:`https://youtu.be/${video.id}`, privacyStatus:'private', publishAt:publishAt.toISO(), thumbnailUploaded:false }, null, 2));
}
main().catch((error)=>{console.error(`삶의여백 롱폼 업로드 실패: ${error.message}`);process.exitCode=1;});
