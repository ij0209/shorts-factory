import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { getAudioDuration } from '../src/generateAudio.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roundName = process.argv.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const round = path.join(root, 'projects/dawn_verse/rounds', roundName);
const introPause = 0.7;
const analysis = JSON.parse(await readFile(path.join(round, 'amen_timing_analysis.json'), 'utf8')).items;

for (const timing of analysis) {
  if (!timing.spokenAmen) throw new Error(`${timing.id}: 아멘 발화가 확인되지 않았습니다.`);
  const file = path.join(round, 'subtitles/aligned', `${timing.id}.json`);
  const captions = JSON.parse(await readFile(file, 'utf8'));
  const amenIndex = captions.findIndex((item) => item.type === 'amen');
  if (amenIndex < 0) throw new Error(`${timing.id}: 아멘 자막이 없습니다.`);
  const duration = await getAudioDuration(path.join(round, 'audio', `${timing.id}.mp3`));
  const amenStart = timing.amenStart + introPause;
  const amenEnd = (timing.ctaStart ? timing.ctaStart - 0.18 : duration) + introPause;
  captions[amenIndex].start = amenStart;
  captions[amenIndex].end = Math.max(amenStart + 0.35, amenEnd);
  if (captions[amenIndex - 1]?.end >= amenStart) captions[amenIndex - 1].end = amenStart - 0.12;
  const ctaIndex = captions.findIndex((item) => item.type === 'cta');
  if (ctaIndex >= 0 && timing.ctaStart) {
    const shift = timing.ctaStart + introPause - captions[ctaIndex].start;
    for (let index = ctaIndex; index < captions.length; index++) {
      captions[index].start += shift;
      captions[index].end += shift;
    }
  }
  for (let index = 1; index < captions.length; index++) {
    if (captions[index - 1].end > captions[index].start) {
      const boundary = (captions[index - 1].end + captions[index].start) / 2;
      captions[index - 1].end = boundary;
      captions[index].start = boundary;
    }
  }
  await writeFile(file, JSON.stringify(captions, null, 2) + '\n');
  console.log(`✓ ${timing.id} 아멘·CTA 실제 발화 경계 동기화`);
}
