import path from 'node:path';
import { DateTime } from 'luxon';
import { loadEnv } from '../utils/loadEnv.js';
import { getYouTubeConfig, rootDir, YOUTUBE_CHANNELS } from './config.js';
import { authorizeInteractively, getAuthorizedClient, verifyAuthorizedChannel } from './auth.js';
import { buildUploadPlan, printUploadPlan } from './scheduleVideos.js';
import { appendUploadHistory, loadUploadHistory } from './uploadHistory.js';
import { uploadVideo } from './uploadVideo.js';
import { findThumbnail, generateThumbnail, uploadThumbnail } from './thumbnail.js';
import { loadContents } from './metadata.js';
import { youtubeChannelForContent } from './config.js';
import { findOutputPath } from '../utils/outputFile.js';
import { getContentProfile } from '../contentTypes/profiles.js';
import { updateTrackedDescriptions } from './updateDescriptions.js';

await loadEnv(path.join(rootDir, '.env'));

function parseArgs(args) {
  const options = { privateTest: false, confirm: false, channel: 'wemakevoice' };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--private') options.privateTest = true;
    else if (arg === '--confirm') options.confirm = true;
    else if (arg === '--allow-gap') options.allowGap = true;
    else if (arg.startsWith('--id=')) options.id = arg.slice(5);
    else if (arg === '--id') options.id = args[++index];
    else if (arg.startsWith('--experiment-id=')) options.experimentId = arg.slice(16);
    else if (arg === '--experiment-id') options.experimentId = args[++index];
    else if (arg.startsWith('--start=')) options.startDate = arg.slice(8);
    else if (arg === '--start') options.startDate = args[++index];
    else if (arg.startsWith('--channel=')) options.channel = arg.slice(10);
    else if (arg === '--channel') options.channel = args[++index];
    else throw new Error(`알 수 없는 옵션: ${arg}`);
  }
  return options;
}

async function main() {
  const command = process.argv[2];
  const options = parseArgs(process.argv.slice(3));
  if (command === 'auth') {
    await authorizeInteractively(options.channel);
    return;
  }
  if (command === 'check-auth') {
    let failed = 0;
    for (const channelName of YOUTUBE_CHANNELS) {
      try {
        const auth = await getAuthorizedClient(channelName);
        const { channelId } = getYouTubeConfig({ channel: channelName });
        const actual = await verifyAuthorizedChannel(auth, channelId);
        console.log(`✓ ${channelName}: ${actual.title} (${actual.id})`);
      } catch (error) {
        console.error(`✗ ${channelName}: ${error.message}`);
        console.error(`  재인증: npm run youtube:auth:${channelName}\n`);
        failed++;
      }
    }
    if (failed) process.exitCode = 1;
    return;
  }
  if (command === 'thumbnails') {
    const config = getYouTubeConfig({ channel: options.channel });
    const auth = await getAuthorizedClient(config.channel);
    const channel = await verifyAuthorizedChannel(auth, config.channelId);
    const contents = (await loadContents()).filter((content) =>
      youtubeChannelForContent(content) === config.channel && (!options.id || content.id === options.id));
    const history = await loadUploadHistory(config.historyPath);
    const uploadedByContentId = new Map(history.map((item) => [item.contentId, item]));

    console.log(`\nYouTube 채널 확인: ${channel.title} (${channel.id})\n`);
    let success = 0;
    let skipped = 0;
    let failed = 0;
    for (const content of contents) {
      const uploaded = uploadedByContentId.get(content.id);
      if (!uploaded?.youtubeVideoId) continue;
      try {
        const videoPath = await findOutputPath(rootDir, content.id, getContentProfile(content).outputDirectory);
        const thumbnailPath = await findThumbnail(videoPath) || await generateThumbnail(videoPath);
        await uploadThumbnail({ auth, videoId: uploaded.youtubeVideoId, thumbnailPath });
        console.log(`✓ ${content.id} https://youtu.be/${uploaded.youtubeVideoId}`);
        success++;
      } catch (error) {
        console.error(`✗ ${content.id}: ${error.message}`);
        failed++;
      }
    }
    console.log(`\nThumbnail Upload Complete\nSuccess: ${success}\nSkipped: ${skipped}\nFailed: ${failed}`);
    if (failed) process.exitCode = 1;
    return;
  }
  if (command === 'tracking-links') {
    if (options.channel !== 'wemakevoice') throw new Error('전환 링크 보정은 wemakevoice 채널만 지원합니다.');
    const result = await updateTrackedDescriptions(options.channel);
    console.log(`YouTube 채널: ${result.channel}`);
    result.updated.forEach((id) => console.log(`✓ ${id}`));
    console.log(`\nTracking Link Update Complete\nUpdated: ${result.updated.length}\nSkipped: ${result.skipped.length}`);
    return;
  }
  if (!['plan', 'upload'].includes(command)) {
    throw new Error('사용법: npm run youtube:auth | npm run youtube:auth:check | npm run youtube:plan | npm run youtube:upload | npm run youtube:thumbnails:* | npm run youtube:tracking-links:wemakevoice');
  }

  const result = await buildUploadPlan(options);
  printUploadPlan(result, options);
  if (command === 'upload' && !options.experimentId && result.plan.some(({ content }) => content.experimentId === 'wmv-round2-dual-track')) {
    throw new Error('Round 2 업로드에는 --experiment-id=wmv-round2-dual-track 지정이 필요합니다.');
  }
  if (command === 'plan' || !result.config.autoUpload) {
    console.log('No videos uploaded.');
    if (command === 'upload' && !result.config.autoUpload) console.log('YOUTUBE_AUTO_UPLOAD=false');
    return;
  }
  if (!result.plan.length) return;
  if (result.plan.length > 1 && !options.confirm) {
    throw new Error('여러 영상을 실제 업로드하려면 계획 확인 후 --confirm 옵션이 필요합니다.');
  }

  const auth = await getAuthorizedClient(result.config.channel);
  const channel = await verifyAuthorizedChannel(auth, result.config.channelId);
  if (result.config.channel === 'dawn-verse' && channel.title.replaceAll(/\s/g, '') !== '새벽한구절') {
    throw new Error(`새벽한구절 업로드 중단: 인증 채널명이 ${channel.title}입니다.`);
  }
  console.log(`\nYouTube 채널 확인: ${channel.title} (${channel.id})\n`);

  let success = 0;
  let failed = 0;
  for (const item of result.plan) {
    try {
      console.log(`UPLOAD ${item.content.id}`);
      const video = await uploadVideo({
        auth,
        videoPath: item.videoPath,
        title: item.metadata.title,
        description: item.metadata.description,
        tags: item.metadata.tags,
        publishAt: item.publishAtUtc,
        categoryId: result.config.categoryId,
        privacyStatus: item.privacyStatus,
        madeForKids: result.config.madeForKids,
      });
      const uploadedAt = DateTime.now().setZone(result.config.timezone).toISO();
      await appendUploadHistory(result.config.historyPath, {
        contentId: item.content.id,
        youtubeVideoId: video.id,
        uploadedAt,
        publishAt: item.publishAtLocal,
        status: item.status,
      });
      console.log(`✓ ${item.content.id} https://youtu.be/${video.id}`);
      success++;
    } catch (error) {
      console.error(`✗ ${item.content.id}: ${error.message}`);
      failed++;
    }
  }
  console.log(`\nYouTube Upload Complete\nSuccess: ${success}\nFailed: ${failed}\nTotal: ${result.plan.length}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`YouTube 작업 실패: ${error.message}`);
  if (/invalid_grant|Token has been expired|revoked/i.test(error.message)) {
    console.error('OAuth refresh token이 만료되었습니다. 해당 채널의 youtube:auth 명령으로 다시 승인하세요.');
  }
  process.exitCode = 1;
});
