import path from 'node:path';
import { access, rename, rm } from 'node:fs/promises';
import { loadEnv } from '../src/utils/loadEnv.js';
import { loadAllContents } from '../src/content/loadContents.js';
import { getContentProfile } from '../src/contentTypes/profiles.js';
import { findOutputPath } from '../src/utils/outputFile.js';
import { getAudioDuration } from '../src/generateAudio.js';
import { createCaptions } from '../src/generateSubtitle.js';
import { ensureBrandSignature, BRAND_SIGNATURE_GAP_SECONDS, BRAND_SIGNATURE_END_PAUSE_SECONDS } from '../src/generateBrandSignature.js';
import { renderVideo } from '../src/renderVideo.js';
import { generateThumbnail } from '../src/youtube/thumbnail.js';
import { rootDir } from '../src/youtube/config.js';

await loadEnv(path.join(rootDir, '.env'));
const requestedId = process.argv[2];
const contents = (await loadAllContents(rootDir)).filter((content) => content.experimentId === 'wmv-round2-dual-track' && (!requestedId || content.id === requestedId));
if (!contents.length) throw new Error(`Round 2 콘텐츠를 찾을 수 없습니다: ${requestedId}`);
let success = 0;
for (const content of contents) {
  const profile = getContentProfile(content);
  const videoPath = await findOutputPath(rootDir, content.id, profile.outputDirectory);
  const backgroundPath = path.join(rootDir, 'assets', 'backgrounds', content.backgroundCategory || content.category, content.background);
  await access(videoPath);
  await access(backgroundPath);
  const brandSignature = profile.id === 'announcement' ? await ensureBrandSignature(rootDir) : null;
  const introDuration = ['broadcast_first', 'result_first'].includes(content.hookType) ? 0 : (profile.introDuration ?? 2);
  const outroDuration = profile.outroDuration ?? 2;
  const totalDuration = await getAudioDuration(videoPath);
  const audioDuration = totalDuration - introDuration - (brandSignature
    ? BRAND_SIGNATURE_GAP_SECONDS + brandSignature.duration + BRAND_SIGNATURE_END_PAUSE_SECONDS
    : outroDuration);
  if (audioDuration <= 0) throw new Error(`${content.id}: 기존 영상 길이가 잘못되었습니다.`);
  const captions = createCaptions({ narration: content.narration, audioDuration, startAt: introDuration });
  const temporaryPath = videoPath.replace(/\.mp4$/, '.background.mp4');
  try {
    const result = await renderVideo({ content, profile, backgroundPath, mixedAudioPath: videoPath, captions, audioDuration, brandSignature, outputPath: temporaryPath, rootDir });
    if (result.usedPlaceholderBackground) throw new Error(`${content.id}: 배경이 반영되지 않았습니다.`);
    await rename(temporaryPath, videoPath);
    await generateThumbnail(videoPath);
    success++;
    console.log(`✓ ${content.id}: ${content.backgroundCategory || content.category}/${content.background}`);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
console.log(`배경 적용 완료: ${success}/${contents.length}`);
