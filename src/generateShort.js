import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateAudio, getAudioDuration } from './generateAudio.js';
import { createAss, createCaptions } from './generateSubtitle.js';
import { renderVideo } from './renderVideo.js';
import { ensureBrandSignature } from './generateBrandSignature.js';
import { getContentProfile, resolveVoiceName } from './contentTypes/profiles.js';
import { renderLifeMarginVideo } from './renderLifeMarginVideo.js';
import { datedOutputPath } from './utils/outputFile.js';
import { run } from './utils/process.js';

async function createNarrationAudio({ content, profile, voiceName, workDir, audioPath }) {
  if (!content.voiceSegments) {
    return generateAudio({
      text: content.narration,
      voiceName,
      outputPath: audioPath,
      prompt: profile.ttsPrompt?.({ narration: content.narration, voiceName }),
    });
  }
  if (!Array.isArray(content.voiceSegments) || content.voiceSegments.length < 2 ||
      content.voiceSegments.map(({ text }) => text).join(' ') !== content.narration) {
    throw new Error('voiceSegments가 narration과 일치해야 합니다.');
  }
  const paths = [];
  for (const [index, segment] of content.voiceSegments.entries()) {
    const segmentPath = path.join(workDir, `voice-${index}.mp3`);
    await generateAudio({
      text: segment.text,
      voiceName: segment.voiceName || voiceName,
      outputPath: segmentPath,
      prompt: profile.ttsPrompt?.({ narration: segment.text, voiceName: segment.voiceName || voiceName }),
    });
    paths.push(segmentPath);
  }
  const listPath = path.join(workDir, 'voice-list.txt');
  await writeFile(listPath, paths.map((item) => `file '${item.replaceAll("'", "'\\''")}'`).join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-codec:a', 'libmp3lame', '-q:a', '2', audioPath]);
}

export async function generateShort(content, rootDir) {
  const profile = getContentProfile(content);
  if (profile.id === 'dawn_verse') throw new Error('새벽한구절은 npm run generate:dawn-verse 전용 생성기를 사용하세요.');
  const voiceName = resolveVoiceName(content, profile);
  const workDir = path.join(rootDir, 'temp', content.id);
  const audioPath = path.join(workDir, 'narration.mp3');
  const subtitlePath = path.join(workDir, 'subtitles.ass');
  const outputPath = datedOutputPath(rootDir, content.id, profile.outputDirectory);
  const backgroundPath = content.background
    ? path.join(rootDir, 'assets', 'backgrounds', content.backgroundCategory || content.category, content.background)
    : null;
  if (content.contentTrack) {
    if (!backgroundPath) throw new Error(`${content.id}: 배경 이미지가 지정되지 않았습니다.`);
    await access(backgroundPath).catch(() => { throw new Error(`${content.id}: 배경 이미지를 찾을 수 없습니다: ${backgroundPath}`); });
  }
  await mkdir(workDir, { recursive: true });
  await mkdir(path.dirname(outputPath), { recursive: true });

  try {
    await createNarrationAudio({ content, profile, voiceName, workDir, audioPath });
    const audioDuration = await getAudioDuration(audioPath);
    const brandSignature = profile.id === 'announcement' ? await ensureBrandSignature(rootDir) : null;
    await writeFile(subtitlePath, createAss({ content, audioDuration }), 'utf8');
    const captionStart = ['broadcast_first', 'result_first'].includes(content.hookType) ? 0 : (profile.audioStart ?? 2);
    const captions = createCaptions({ narration: content.narration, audioDuration, startAt: captionStart });
    const result = profile.id === 'life-margin'
      ? await renderLifeMarginVideo({ content, profile, audioPath, captions, audioDuration, outputPath, rootDir })
      : await renderVideo({ content, profile, backgroundPath, audioPath, subtitlePath, captions, audioDuration, brandSignature, outputPath, rootDir });
    if (process.env.KEEP_TEMP_FILES !== 'true') await rm(workDir, { recursive: true, force: true });
    return result;
  } catch (error) {
    error.message = `${content.id}: ${error.message}`;
    throw error;
  }
}
