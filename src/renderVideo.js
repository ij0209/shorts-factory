import path from 'node:path';
import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { BRAND_SIGNATURE_END_PAUSE_SECONDS, BRAND_SIGNATURE_GAP_SECONDS } from './generateBrandSignature.js';

async function fileExists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

function getBundle(rootDir) {
  return bundle({
    entryPoint: path.join(rootDir, 'src', 'remotion', 'index.jsx'),
    publicDir: path.join(rootDir, 'public'),
  });
}

export async function renderVideo({ content, profile, backgroundPath, audioPath, mixedAudioPath, captions, audioDuration, brandSignature, outputPath, rootDir }) {
  const assetDir = path.join(rootDir, 'public', 'generated', content.id);
  await mkdir(assetDir, { recursive: true });
  if (audioPath) await copyFile(audioPath, path.join(assetDir, 'narration.mp3'));
  if (mixedAudioPath) await copyFile(mixedAudioPath, path.join(assetDir, 'soundtrack.mp4'));
  if (brandSignature) await copyFile(brandSignature.path, path.join(assetDir, 'brand-signature.mp3'));

  const hasBackground = backgroundPath ? await fileExists(backgroundPath) : false;
  const backgroundName = hasBackground ? `background${path.extname(backgroundPath) || '.png'}` : null;
  if (hasBackground) await copyFile(backgroundPath, path.join(assetDir, backgroundName));

  const inputProps = {
    hook: content.hook,
    hookType: content.hookType,
    contentTrack: content.contentTrack,
    hookLabel: content.hookLabel,
    hookAccent: content.hookAccent,
    visualVariant: content.visualVariant,
    narration: content.narration,
    captions,
    backgroundVideo: backgroundName ? `generated/${content.id}/${backgroundName}` : null,
    audioFile: audioPath ? `generated/${content.id}/narration.mp3` : null,
    mixedAudioFile: mixedAudioPath ? `generated/${content.id}/soundtrack.mp4` : null,
    bgmFile: mixedAudioPath ? null : (content.bgm ?? 'music/shorts-ai-bgm.mp3'),
    audioDuration,
    introDuration: ['broadcast_first', 'result_first'].includes(content.hookType) ? 0 : (profile.introDuration ?? 2),
    outroDuration: profile.outroDuration ?? 2,
    brandSignatureEnabled: Boolean(brandSignature),
    brandSignatureFile: brandSignature ? `generated/${content.id}/brand-signature.mp3` : null,
    brandSignatureDuration: brandSignature?.duration ?? 0,
    brandSignatureGap: BRAND_SIGNATURE_GAP_SECONDS,
    brandSignatureEndPause: BRAND_SIGNATURE_END_PAUSE_SECONDS,
    brand: 'WeMakeVoice',
    outroText: content.outro?.text ?? profile.outroText ?? '매일 반복되는 안내방송\n자동으로',
    website: content.website ?? 'wemakevoice.com',
  };

  try {
    const serveUrl = await getBundle(rootDir);
    const composition = await selectComposition({ serveUrl, id: 'ShortsTemplate', inputProps });
    await renderMedia({ serveUrl, composition, codec: 'h264', outputLocation: outputPath, inputProps });
  } finally {
    if (process.env.KEEP_REMOTION_ASSETS !== 'true') await rm(assetDir, { recursive: true, force: true });
  }

  const introDuration = inputProps.introDuration;
  const duration = brandSignature
    ? introDuration + audioDuration + BRAND_SIGNATURE_GAP_SECONDS + brandSignature.duration + BRAND_SIGNATURE_END_PAUSE_SECONDS
    : introDuration + audioDuration + inputProps.outroDuration;
  return { outputPath, usedPlaceholderBackground: !hasBackground, duration };
}
