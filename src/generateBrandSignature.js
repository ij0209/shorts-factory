import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { generateAudio, getAudioDuration } from './generateAudio.js';
import { run } from './utils/process.js';

export const BRAND_SIGNATURE_GAP_SECONDS = 1;
export const BRAND_SIGNATURE_END_PAUSE_SECONDS = 1;

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function isBrandSignatureEnabled() {
  return process.env.ENABLE_BRAND_SIGNATURE !== 'false';
}

export async function ensureBrandSignature(rootDir) {
  if (!isBrandSignatureEnabled()) return null;

  const outputPath = path.join(rootDir, 'assets', 'audio', 'brand-signature.mp3');
  await mkdir(path.dirname(outputPath), { recursive: true });

  if (!(await fileExists(outputPath))) {
    const rawPath = path.join(path.dirname(outputPath), 'brand-signature.raw.mp3');
    await generateAudio({
      text: 'WeMakeVoice',
      voiceName: process.env.BRAND_SIGNATURE_VOICE || 'Algenib',
      outputPath: rawPath,
      prompt: 'Read only the English brand name WeMakeVoice exactly once. Use a native North American English male bass-baritone voice with a deep, smooth and premium tone. Pronounce WeMakeVoice seamlessly as one connected brand phrase. Keep it modern, calm, concise and highly intelligible. Do not use Korean-accented English, added words, music or sound effects. Text: WeMakeVoice',
    });
    await run('ffmpeg', [
      '-y', '-i', rawPath,
      '-af', 'silenceremove=start_periods=1:start_duration=0.05:start_threshold=-42dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-42dB:start_silence=0.03,areverse',
      '-codec:a', 'libmp3lame', '-q:a', '2', outputPath,
    ]);
    await rm(rawPath, { force: true });
    await rm(path.join(path.dirname(outputPath), 'brand-signature.raw.pcm'), { force: true });
  }

  return {
    path: outputPath,
    duration: await getAudioDuration(outputPath),
  };
}
