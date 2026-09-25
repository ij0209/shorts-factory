import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, copyFile, access } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { generateAudio, getAudioDuration } from '../src/generateAudio.js';
import { createCaptions } from '../src/generateSubtitle.js';
import { loadEnv } from '../src/utils/loadEnv.js';
import { run } from '../src/utils/process.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fps = 30;

async function exists(file) { try { await access(file); return true; } catch { return false; } }

async function main() {
  await loadEnv(path.join(rootDir, '.env'));
  const contentPath = path.join(rootDir, 'contents', 'longform', 'wemakevoice-camping-checkout-001.json');
  const content = JSON.parse(await readFile(contentPath, 'utf8'));
  const publicAssetDir = path.join(rootDir, 'public', 'generated', content.id);
  const audioDir = path.join(rootDir, 'audio', 'longform', content.id);
  const outputDir = path.join(rootDir, 'output', 'wemakevoice-longform');
  await Promise.all([mkdir(publicAssetDir, { recursive: true }), mkdir(audioDir, { recursive: true }), mkdir(outputDir, { recursive: true })]);

  const appSource = path.join(rootDir, 'assets', 'video', 'screen-20260908-152027.mp4');
  const derivedDir = path.join(rootDir, 'assets', 'video', 'derived');
  const normalizedApp = path.join(derivedDir, 'screen-20260908-152027-30fps.mp4');
  await mkdir(derivedDir, { recursive: true });
  if (!await exists(normalizedApp)) await run('ffmpeg', [
    '-y', '-i', appSource, '-vf', 'fps=30', '-an', '-c:v', 'libx264',
    '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', normalizedApp,
  ]);
  await copyFile(normalizedApp, path.join(publicAssetDir, 'app-recording.mp4'));
  const backgrounds = [...new Set(content.scenes.map((scene) => scene.background).filter(Boolean))];
  for (const file of backgrounds) {
    await copyFile(path.join(rootDir, 'assets', 'backgrounds', 'camping', file), path.join(publicAssetDir, file));
  }

  const announcementPath = path.join(audioDir, 'announcement.mp3');
  if (!await exists(announcementPath)) await generateAudio({
    text: content.announcement, voiceName: 'Aoede', outputPath: announcementPath,
    prompt: `다음 한국어 문구만 또렷한 전문 안내방송 목소리로 읽어주세요. 친절하고 안정적이며 실제 캠핑장 스피커에서 자연스럽게 들리는 속도로 읽고, 단어를 추가하거나 바꾸지 마세요.\n\n${content.announcement}`,
  });

  const prepared = [];
  for (const scene of content.scenes) {
    const audioPath = scene.audioRole === 'announcement_example' ? announcementPath : path.join(audioDir, `${scene.id}.mp3`);
    if (!scene.audioRole && !await exists(audioPath)) await generateAudio({
      text: scene.narration, voiceName: 'Aoede', outputPath: audioPath,
      prompt: `다음 한국어 원고만 쉽고 친절한 제품 설명 영상의 내레이션으로 읽어주세요. 차분하고 신뢰감 있는 성인 목소리, 자연스러운 대화 속도, 과장 없는 톤을 사용하고 단어를 추가하거나 바꾸지 마세요.\n\n${scene.narration}`,
    });
    const audioDuration = await getAudioDuration(audioPath);
    prepared.push({ ...scene, audioPath, audioDuration });
  }

  let cursor = 0;
  const scenes = [];
  for (const scene of prepared) {
    const duration = scene.audioDuration + (scene.kind === 'app' ? 0.8 : 1.2);
    const startFrame = Math.round(cursor * fps);
    const durationFrames = Math.ceil(duration * fps);
    const audioName = `${scene.id}-audio.mp3`;
    await copyFile(scene.audioPath, path.join(publicAssetDir, audioName));
    scenes.push({
      ...scene, startFrame, durationFrames,
      audioFile: `generated/${content.id}/${audioName}`,
      appFile: `generated/${content.id}/app-recording.mp4`,
      backgroundFile: `generated/${content.id}/${scene.background || 'camping-checkout-001.png'}`,
      captions: createCaptions({ narration: scene.audioRole ? content.announcement : scene.narration, audioDuration: scene.audioDuration, startAt: 0 }),
    });
    cursor += duration;
  }

  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
  const outputPath = path.join(outputDir, `${content.id}_${date}.mp4`);
  const serveUrl = await bundle({ entryPoint: path.join(rootDir, 'src', 'remotion', 'index.jsx'), publicDir: path.join(rootDir, 'public') });
  const inputProps = { scenes, bgmFile: 'music/content/camping-checkout-001.mp3', fps };
  const composition = await selectComposition({ serveUrl, id: 'WemakeVoiceLongformTemplate', inputProps });
  await renderMedia({ serveUrl, composition, codec: 'h264', outputLocation: outputPath, inputProps });
  console.log(JSON.stringify({ outputPath, duration: cursor, scenes: scenes.map(({ id, startFrame, durationFrames, sourceStart, sourceEnd }) => ({ id, start: startFrame / fps, end: (startFrame + durationFrames) / fps, sourceStart, sourceEnd })) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
