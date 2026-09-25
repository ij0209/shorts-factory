import path from 'node:path';
import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function timeScenes(scenes, audioDuration, audioStart) {
  const weights = scenes.map(({ narration }) => Math.max([...narration].length, 8));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = audioStart;
  return scenes.map((scene, index) => {
    const duration = index === scenes.length - 1
      ? audioStart + audioDuration - cursor
      : audioDuration * weights[index] / total;
    const timed = { ...scene, start: cursor, end: cursor + duration };
    cursor += duration;
    return timed;
  });
}

export async function renderLifeMarginVideo({ content, profile, audioPath, captions, audioDuration, outputPath, rootDir }) {
  if (!Array.isArray(content.scenes) || content.scenes.length < 5) throw new Error('life-margin 콘텐츠에는 최소 5개 Scene이 필요합니다.');
  const assetDir = path.join(rootDir, 'public', 'generated', content.id);
  await mkdir(assetDir, { recursive: true });
  await copyFile(audioPath, path.join(assetDir, 'narration.mp3'));

  const copiedScenes = [];
  for (const [index, scene] of content.scenes.entries()) {
    const source = path.join(rootDir, 'assets', 'broll', 'life-margin', scene.asset);
    if (!await exists(source)) throw new Error(`B-roll 없음: ${source}`);
    const filename = `scene-${String(index + 1).padStart(2, '0')}${path.extname(source)}`;
    await copyFile(source, path.join(assetDir, filename));
    copiedScenes.push({ ...scene, src: `generated/${content.id}/${filename}` });
  }

  const inputProps = {
    brand: profile.brand,
    categoryLabel: content.categoryLabel,
    hook: content.hook,
    coverSafe: content.experiment?.phase?.startsWith('round1'),
    scenes: timeScenes(copiedScenes, audioDuration, profile.audioStart),
    captions,
    audioFile: `generated/${content.id}/narration.mp3`,
    bgmFile: content.bgm,
    audioStart: profile.audioStart,
    audioDuration,
    outroDuration: profile.outroDuration,
    outroText: profile.outroText,
    tagline: profile.tagline,
  };
  try {
    const serveUrl = await bundle({
      entryPoint: path.join(rootDir, 'src', 'remotion', 'index.jsx'),
      publicDir: path.join(rootDir, 'public'),
    });
    const composition = await selectComposition({ serveUrl, id: profile.compositionId, inputProps });
    await renderMedia({ serveUrl, composition, codec: 'h264', outputLocation: outputPath, inputProps });
  } finally {
    if (process.env.KEEP_REMOTION_ASSETS !== 'true') await rm(assetDir, { recursive: true, force: true });
  }
  return { outputPath, usedPlaceholderBackground: false, duration: profile.audioStart + audioDuration + profile.outroDuration };
}
