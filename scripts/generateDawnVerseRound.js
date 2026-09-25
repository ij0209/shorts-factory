import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, copyFile, access, rm } from 'node:fs/promises';
import { DateTime } from 'luxon';
import { getAudioDuration } from '../src/generateAudio.js';
import { run } from '../src/utils/process.js';
import { loadEnv } from '../src/utils/loadEnv.js';
import { splitCaptionChunks, wrapKoreanCaption } from '../src/generateSubtitle.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'projects/dawn_verse');
const args = process.argv.slice(2);
const roundName = args.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const roundDir = path.join(project, 'rounds', roundName);
const durationRange = roundName === 'DAWN_VERSE_ROUND_1B' ? [45, 81] : [22, 45.8];
const contentsPath = path.join(roundDir, 'contents.json');
const historyPath = path.join(project, 'history/content_history.json');
const metadataPath = path.join(roundDir, 'experiment_metadata.json');
const reportPath = path.join(roundDir, 'qc_report.json');
const timingPath = path.join(roundDir, 'audio_timing.json');
const assetsRoot = path.join(root, 'assets/broll/dawn-verse');
const outputDir = path.join(root, 'output/dawn-verse');
const bgmFile = roundName === 'DAWN_VERSE_ROUND_1B'
  ? 'music/dawn-verse/dawn-prayer-piano-002.mp3'
  : 'music/dawn-verse/morning-ambient-001.mp3';
const introPause = 0.7;
const onlyId = args.find((arg) => arg.startsWith('--id='))?.slice(5);

async function exists(file) { try { await access(file); return true; } catch { return false; } }
function compact(text) { return text.replaceAll(/\s+/g, ' ').trim(); }
function chunks(text, limit = 24) {
  return (compact(text).match(/[^.!?。！？]+[.!?。！？]?/g) || [text])
    .flatMap((sentence) => splitCaptionChunks(compact(sentence), Math.max(18, limit - 2), limit));
}
function parts(content) {
  const prayerWithoutAmen = content.prayer.replace(/\s*아멘[.!。！]?\s*$/, '').trim();
  const blocks = [
    { type: 'hook', text: content.hook },
    { type: 'verse', text: content.verse_excerpt },
    { type: 'reflection', text: content.reflection },
    { type: 'prayer', text: prayerWithoutAmen },
    { type: 'amen', text: '아멘.' },
  ];
  if (content.cta) blocks.push({ type: 'cta', text: content.cta });
  return blocks;
}
function weightedCaptions(items, duration, start) {
  if (!items.length) return [];
  const weights = items.map(({ text }) => Math.max([...text].length, 8));
  const total = weights.reduce((a, b) => a + b, 0);
  let at = start;
  return items.map((item, index) => {
    const end = index === items.length - 1 ? start + duration : at + duration * weights[index] / total;
    const caption = { ...item, start: Math.round(at * 100) / 100, end: Math.round(end * 100) / 100 };
    at = end;
    return caption;
  });
}
function captionsFor(blocks, duration, timing, start = 0.2) {
  const items = blocks.flatMap(({ type, text }) => chunks(text, type === 'hook' ? 29 : type === 'amen' ? 12 : 34).map((part) => ({ type, text: part })));
  if (!timing) return weightedCaptions(items, duration, start);
  const bodyItems = items.filter(({ type }) => !['amen', 'cta'].includes(type));
  const amenItems = items.filter(({ type }) => type === 'amen');
  const ctaItems = items.filter(({ type }) => type === 'cta');
  const amenStart = start + timing.amenStart;
  const ctaStart = start + timing.coreDuration + timing.ctaLeadIn;
  return [
    ...weightedCaptions(bodyItems, timing.preAmenDuration, start),
    ...weightedCaptions(amenItems, Math.max(0.2, timing.coreDuration - timing.amenStart), amenStart),
    ...weightedCaptions(ctaItems, timing.ctaDuration, ctaStart),
  ];
}
function assTime(seconds) {
  const cs = Math.round(seconds * 100);
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
}
function assSafe(value) { return value.replaceAll('\\', '／').replaceAll('{', '（').replaceAll('}', '）'); }
function assWrap(value, max = 15) {
  return assSafe(wrapKoreanCaption(value, max)).replaceAll('\n', '\\N');
}
function makeAss(captions, reference, duration) {
  const events = [
    `Dialogue: 0,${assTime(0)},${assTime(duration)},Brand,,0,0,0,,새벽한구절`,
    `Dialogue: 0,${assTime(0)},${assTime(duration)},Footer,,0,0,0,,매일 새벽 5시 · 하루를 여는 말씀 한 구절`,
    `Dialogue: 3,${assTime(0)},${assTime(duration)},Reference,,0,0,0,,{\\an3\\pos(980,1725)}오늘의 말씀 · ${assSafe(reference)}`,
  ];
  for (const caption of captions) {
    const style = caption.type === 'hook' ? 'Hook' : 'Caption';
    events.push(`Dialogue: 1,${assTime(caption.start)},${assTime(caption.end)},${style},,0,0,0,,${assWrap(caption.text)}`);
  }
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Brand,AppleMyungjo,49,&H00F7FAFF,&H000000FF,&H00141E28,&H800C1720,-1,0,0,0,100,100,2,0,1,0,2,7,76,76,130,1\nStyle: Hook,AppleMyungjo,94,&H00FFFFFF,&H000000FF,&H00141E28,&H00000000,-1,0,0,0,100,100,0,0,1,1.2,2,5,95,95,0,1\nStyle: Caption,AppleMyungjo,82,&H00FFFFFF,&H000000FF,&H00141E28,&H00000000,-1,0,0,0,100,100,0,0,1,1.2,2,5,95,95,0,1\nStyle: Reference,AppleMyungjo,44,&H00A6DAF8,&H000000FF,&H00141E28,&H00000000,-1,0,0,0,100,100,0,0,1,0.8,2,3,90,90,190,1\nStyle: Footer,AppleMyungjo,31,&H00F7FAFF,&H000000FF,&H00141E28,&H00000000,0,0,0,0,100,100,1,0,1,0.6,1,2,90,90,290,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
}
function duplicateErrors(contents, history) {
  const issues = [];
  const prior = history.filter((x) => x.project === 'dawn_verse');
  for (const [index, item] of contents.entries()) {
    for (const other of [...prior, ...contents.slice(0, index)]) {
      if (other.id === item.id) continue;
      if (item.bible_reference === other.bible_reference && item.human_problem === other.human_problem) issues.push(`${item.id}: 같은 구절과 고민 ${other.id}`);
      for (const field of ['hook', 'reflection', 'prayer', 'visual_concept', 'title']) {
        if (compact(item[field] || '') && compact(item[field] || '') === compact(other[field] || '')) issues.push(`${item.id}: 같은 ${field} ${other.id}`);
      }
    }
    const previous = contents[index - 1];
    if (previous && item.hook_type === previous.hook_type) issues.push(`${item.id}: Hook 유형 연속 사용`);
    if (previous && item.cta_type !== 'NONE' && item.cta_type === previous.cta_type) issues.push(`${item.id}: CTA 연속 사용`);
    if (contents.slice(Math.max(0, index - 9), index).some((x) => x.bible_reference === item.bible_reference)) issues.push(`${item.id}: 10편 내 같은 구절`);
    if (contents.slice(Math.max(0, index - 9), index).filter((x) => x.topic === item.topic).length >= 2) issues.push(`${item.id}: 10편 내 주제 3회`);
    if (!item.bible_text.includes(item.verse_excerpt)) issues.push(`${item.id}: 발췌문 불일치`);
  }
  return issues;
}
function scheduleStart() {
  const now = DateTime.now().setZone('Asia/Seoul');
  const today = now.startOf('day').set({ hour: 5 });
  return (today > now ? today : today.plus({ days: 1 }));
}
async function probe(file) {
  return JSON.parse(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', file]));
}

await loadEnv(path.join(root, '.env'));
await mkdir(path.dirname(historyPath), { recursive: true });
await mkdir(outputDir, { recursive: true });
await mkdir(path.join(roundDir, 'audio'), { recursive: true });
await mkdir(path.join(roundDir, 'subtitles'), { recursive: true });
await mkdir(path.join(root, 'public/music/dawn-verse'), { recursive: true });
if (roundName === 'DAWN_VERSE_ROUND_1B' && !await exists(path.join(root, 'public', bgmFile))) {
  throw new Error(`새벽한구절 전용 배경음악이 없습니다: ${bgmFile}`);
}
if (roundName === 'DAWN_VERSE_ROUND_1A' && !await exists(path.join(root, 'public', bgmFile))) {
  await copyFile(path.join(root, 'public/music/life-margin/quiet-reflection-001.mp3'), path.join(root, 'public', bgmFile));
}
const source = JSON.parse(await readFile(contentsPath, 'utf8'));
const history = await exists(historyPath) ? JSON.parse(await readFile(historyPath, 'utf8')) : [];
const errors = duplicateErrors(source.contents, history);
if (errors.length) throw new Error(`중복 검사 실패:\n${errors.join('\n')}`);
const first = scheduleStart();
const date = DateTime.now().setZone('Asia/Seoul').toFormat('yyyyLLdd');
const review = await exists(reportPath) ? JSON.parse(await readFile(reportPath, 'utf8')) : {};
const audioTiming = await exists(timingPath) ? JSON.parse(await readFile(timingPath, 'utf8')) : {};
for (const content of source.contents.filter((item) => !onlyId || item.id === onlyId)) {
  const videoPath = path.join(outputDir, `${content.id}_${date}.mp4`);
  const audioPath = path.join(roundDir, 'audio', `${content.id}.mp3`);
  const imageSource = path.join(assetsRoot, content.visual_asset);
  const publicDir = path.join(root, 'public/generated', content.id);
  const narrationBlocks = parts(content);
  const narration = narrationBlocks.map(({ text }) => compact(text)).join(' ');
  const publishAt = first.plus({ days: content.day - 1 }).toISO();
  const status = { id: content.id, day: content.day, publishAt, videoPath, audioPath, qc: [] };
  try {
    if (!await exists(imageSource)) throw new Error(`배경 이미지 없음: ${imageSource}`);
    await mkdir(publicDir, { recursive: true });
    const imageFile = `generated/${content.id}/visual${path.extname(imageSource)}`;
    await copyFile(imageSource, path.join(root, 'public', imageFile));
    status.voiceEngine = history.find((x) => x.id === content.id)?.voice;
    if (status.voiceEngine !== 'gemini-charon-pastor-approved-v6' || !await exists(audioPath)) {
      throw new Error('승인된 Gemini 음성이 없습니다. 먼저 node scripts/generateDawnVerseVoices.js를 실행하세요.');
    }
    let audioDuration = await getAudioDuration(audioPath);
    if (audioDuration > durationRange[1] || audioDuration < durationRange[0]) throw new Error(`승인 범위를 벗어난 음성 길이: ${audioDuration.toFixed(1)}초`);
    const captions = captionsFor(narrationBlocks, audioDuration, audioTiming[content.id], introPause);
    await writeFile(path.join(roundDir, 'subtitles', `${content.id}.json`), JSON.stringify(captions, null, 2));
    const assPath = path.join(roundDir, 'subtitles', `${content.id}.ass`);
    const totalDuration = audioDuration + introPause + 0.65;
    await writeFile(assPath, makeAss(captions, content.bible_reference, totalDuration));
    const filter = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.09:contrast=1.04,ass='${assPath}'[v];[1:a]adelay=${Math.round(introPause * 1000)}|${Math.round(introPause * 1000)},volume=1.0[voice];[2:a]volume=0.075[bed];[voice][bed]amix=inputs=2:duration=first:dropout_transition=0[a]`;
    await run('ffmpeg', ['-y', '-loop', '1', '-framerate', '30', '-t', String(totalDuration), '-i', imageSource, '-i', audioPath, '-stream_loop', '-1', '-i', path.join(root, 'public', bgmFile), '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-t', String(totalDuration), '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', videoPath]);
    const media = await probe(videoPath);
    const duration = Number(media.format.duration);
    status.duration = duration;
    status.qc = [
      { check: `duration_${durationRange[0]}_${durationRange[1]}`, pass: duration >= durationRange[0] && duration <= durationRange[1] },
      { check: 'vertical_1080x1920', pass: media.streams.some((s) => s.width === 1080 && s.height === 1920) },
      { check: 'audio_stream', pass: media.streams.some((s) => s.codec_type === 'audio') },
      { check: 'verse_source', pass: Boolean(content.verse_source && content.bible_text.includes(content.verse_excerpt)) },
      { check: 'brand_voice', pass: status.voiceEngine === 'gemini-charon-pastor-approved-v6' },
    ];
    const newEntry = {
      ...content, project: 'dawn_verse', generation_round: source.round, created_at: DateTime.now().toISO(),
      publish_at: publishAt, translation: 'Korean Bible 1910', license: 'Public Domain', narration,
      voice: status.voiceEngine, visual_style: content.visual_concept, youtube_id: null,
      status: status.qc.every((x) => x.pass) ? 'rendered_qc_passed' : 'rendered_review_required',
      duration_seconds: duration, youtubeUpload: false, longform_candidate: false,
    };
    const old = history.findIndex((x) => x.id === content.id);
    if (old >= 0) history[old] = newEntry; else history.push(newEntry);
    console.log(`✓ ${content.id} ${duration.toFixed(1)}s ${newEntry.status}`);
  } catch (error) { status.error = error.message; console.error(`✗ ${content.id}: ${error.message}`); }
  review[content.id] = status;
  await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n');
  await writeFile(reportPath, JSON.stringify(review, null, 2) + '\n');
  await rm(publicDir, { recursive: true, force: true });
}
await writeFile(metadataPath, JSON.stringify(source.contents.map((item) => ({ id: item.id, project: 'dawn_verse', round: source.round, day: item.day, topic: item.topic, hook_type: item.hook_type, voice: review[item.id]?.voiceEngine || 'unverified', visual_style: item.visual_concept, cta_type: item.cta_type, publish_at: first.plus({ days: item.day - 1 }).toISO(), youtube_id: null, status: review[item.id]?.error ? 'render_failed' : review[item.id]?.qc?.every((check) => check.pass) ? 'rendered_qc_passed' : 'rendered_review_required' })), null, 2) + '\n');
