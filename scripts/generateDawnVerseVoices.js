import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { generateAudio, getAudioDuration } from '../src/generateAudio.js';
import { loadEnv } from '../src/utils/loadEnv.js';
import { run } from '../src/utils/process.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roundName = process.argv.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const round = path.join(root, 'projects/dawn_verse/rounds', roundName);
const durationRange = roundName === 'DAWN_VERSE_ROUND_1B' ? [45, 80] : [22, 45];
const id = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5);
const edgeTrim = 'silenceremove=start_periods=1:start_duration=0.08:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_duration=0.08:start_threshold=-40dB,areverse';
const amenPause = 0.9;

function exists(file) { return access(file).then(() => true, () => false); }

function lastSpokenPause(file) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-i', file, '-af', 'silencedetect=noise=-38dB:d=0.12', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`침묵 분석 실패: ${result.stderr.slice(-500)}`);
  const starts = [...result.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((match) => Number(match[1]));
  const ends = [...result.stderr.matchAll(/silence_end: ([0-9.]+) \| silence_duration: ([0-9.]+)/g)]
    .map((match) => ({ end: Number(match[1]), duration: Number(match[2]) }));
  const spans = starts.map((start, index) => ({ start, ...ends[index] })).filter((span) => Number.isFinite(span.end));
  const pause = spans.at(-1);
  if (!pause || pause.start < 1) throw new Error('아멘 직전의 자연스러운 호흡을 찾지 못했습니다.');
  return pause;
}

await loadEnv(path.join(root, '.env'));
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 없습니다.');
process.env.USE_LOCAL_TTS = 'false';
const { contents } = JSON.parse(await readFile(path.join(round, 'contents.json'), 'utf8'));
const timingPath = path.join(round, 'audio_timing.json');
const audioTiming = await exists(timingPath) ? JSON.parse(await readFile(timingPath, 'utf8')) : {};
const historyPath = path.join(root, 'projects/dawn_verse/history/content_history.json');
await mkdir(path.join(round, 'audio'), { recursive: true });

for (const content of contents.filter((item) => !id || item.id === id)) {
  const audioDir = path.join(round, 'audio');
  const target = path.join(audioDir, `${content.id}.mp3`);
  const coreGenerated = path.join(audioDir, `${content.id}-gemini-pastor-v5-core.mp3`);
  const coreTrimmed = path.join(audioDir, `${content.id}-gemini-pastor-v5-core-trimmed.mp3`);
  const coreNormalized = path.join(audioDir, `${content.id}-gemini-pastor-v5-core-final.mp3`);
  const ctaGenerated = path.join(audioDir, `${content.id}-gemini-pastor-v5-cta.mp3`);
  const ctaTrimmed = path.join(audioDir, `${content.id}-gemini-pastor-v5-cta-trimmed.mp3`);
  try {
    if (!await exists(coreGenerated)) {
      await generateAudio({
        text: [content.hook, content.verse_excerpt, content.reflection, content.prayer].join(' '),
        voiceName: 'Charon',
        outputPath: coreGenerated,
        prompt: `아래 한국어 원고를 한 명의 동일한 화자가 처음부터 끝까지 이어서 정확히 읽어주세요. Hook, 말씀, 묵상, 기도 같은 구분 이름은 읽지 마세요.

전체 목소리는 50대 후반의 경험 많은 한국인 남성 목회자 같은 안정된 중저음입니다. 묵직하고 차분하되 설교조로 과장하지 않습니다.
- Hook과 묵상은 한 사람에게 가까이 이야기하듯 자연스럽게 읽습니다.
- 말씀은 성경을 봉독하듯 속도를 조금 낮추고 경건한 무게와 또렷한 발음을 더합니다.
- 기도와 마지막 “아멘.”은 같은 목소리, 같은 음색, 같은 공간감, 같은 호흡으로 이어서 읽습니다.
- “아멘.”만 별도의 목소리처럼 낮추거나 과장하지 마세요. 기도 마지막 문장을 마친 뒤 짧게 한 번 호흡하고, 담담하지만 분명한 종지감으로 “아멘.”이라고 말하세요.

원고의 단어를 추가하거나 바꾸지 마세요.

Hook: ${content.hook}
말씀: ${content.verse_excerpt}
묵상: ${content.reflection}
기도: ${content.prayer}`,
      });
    }
    await run('ffmpeg', ['-y', '-i', coreGenerated, '-af', edgeTrim, '-codec:a', 'libmp3lame', '-q:a', '2', coreTrimmed]);
    const pause = lastSpokenPause(coreTrimmed);
    await run('ffmpeg', [
      '-y', '-t', String(pause.start), '-i', coreTrimmed,
      '-ss', String(pause.end), '-i', coreTrimmed,
      '-f', 'lavfi', '-t', String(amenPause), '-i', 'anullsrc=r=24000:cl=mono',
      '-filter_complex', '[0:a][2:a][1:a]concat=n=3:v=0:a=1[a]', '-map', '[a]',
      '-codec:a', 'libmp3lame', '-q:a', '2', coreNormalized,
    ]);

    let ctaDuration = 0;
    const ctaLeadIn = content.cta ? 1.2 : 0;
    if (content.cta) {
      if (!await exists(ctaGenerated)) {
        await generateAudio({
          text: content.cta,
          voiceName: 'Charon',
          outputPath: ctaGenerated,
          prompt: `같은 50대 후반 한국인 남성 목회자의 안정된 중저음으로 아래 문장만 자연스럽고 따뜻하게 읽으세요. 기도를 마친 뒤 청자에게 건네는 일상적인 안내입니다. 과장하거나 단어를 바꾸지 마세요.\n\n${content.cta}`,
        });
      }
      await run('ffmpeg', ['-y', '-i', ctaGenerated, '-af', edgeTrim, '-codec:a', 'libmp3lame', '-q:a', '2', ctaTrimmed]);
      await run('ffmpeg', [
        '-y', '-i', coreNormalized,
        '-f', 'lavfi', '-t', String(ctaLeadIn), '-i', 'anullsrc=r=24000:cl=mono',
        '-i', ctaTrimmed,
        '-filter_complex', '[0:a][1:a][2:a]concat=n=3:v=0:a=1[a]', '-map', '[a]',
        '-codec:a', 'libmp3lame', '-q:a', '2', target,
      ]);
      ctaDuration = await getAudioDuration(ctaTrimmed);
    } else {
      await run('ffmpeg', ['-y', '-i', coreNormalized, '-codec:a', 'libmp3lame', '-q:a', '2', target]);
    }

    const coreDuration = await getAudioDuration(coreNormalized);
    const finalDuration = await getAudioDuration(target);
    if (finalDuration < durationRange[0] || finalDuration > durationRange[1]) throw new Error(`결합 후 길이 이상: ${finalDuration.toFixed(1)}초`);
    const history = JSON.parse(await readFile(historyPath, 'utf8'));
    let row = history.find((item) => item.id === content.id);
    if (!row) {
      row = { ...content, project: 'dawn_verse', generation_round: roundName, youtube_id: null, youtubeUpload: false };
      history.push(row);
    }
    row.voice = 'gemini-charon-pastor-approved-v6';
    row.status = 'voice-generated-awaiting-render';
    await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n');
    audioTiming[content.id] = {
      preAmenDuration: pause.start,
      amenPause,
      amenStart: pause.start + amenPause,
      coreDuration,
      ctaLeadIn,
      ctaDuration,
      totalDuration: finalDuration,
    };
    await writeFile(timingPath, JSON.stringify(audioTiming, null, 2) + '\n');
    console.log(`✓ ${content.id} Gemini Charon pastor v6 ${finalDuration.toFixed(1)}s (아멘 전 ${amenPause.toFixed(1)}초, CTA 전 ${ctaLeadIn.toFixed(1)}초)`);
  } catch (error) {
    console.error(`✗ ${content.id}: ${error.message}`);
    process.exitCode = 1;
  }
}
