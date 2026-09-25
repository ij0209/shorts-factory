import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';
import { run } from '../src/utils/process.js';
import { loadAllContents } from '../src/content/loadContents.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await loadEnv(path.join(rootDir, '.env'));
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 필요합니다.');

const requestedIds = new Set(process.argv.slice(2));
const contents = (await loadAllContents(rootDir)).filter((content) =>
  content.bgm && content.bgmPrompt && (!requestedIds.size || requestedIds.has(content.id))
);
if (!contents.length) throw new Error('생성할 콘텐츠 음악이 없습니다.');

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function generate(content) {
  const outputPath = path.join(rootDir, 'public', content.bgm);
  if (await exists(outputPath)) {
    console.log(`↷ ${content.id} 기존 음악 사용`);
    return;
  }

  const purpose = content.contentType === 'life-margin'
    ? 'The calm Korean senior-wisdom narration is the primary content. Create emotional warmth without sentimentality. Start almost imperceptibly, keep the midrange very sparse, use restrained dynamics, and make the ending loop smoothly.'
    : 'The Korean public-address narration is the primary content. Start pleasantly within the first second, keep the midrange sparse, use restrained dynamics and a loop-friendly ending.';
  const prompt = `Create a polished, original 30-second instrumental background track for a Korean YouTube Shorts video titled "${content.title}".

Specific musical direction: ${content.bgmPrompt}.

${purpose} Instrumental only: no vocals, speech, chanting or recognizable melody. Avoid cheesy advertising jingles, bells, cinematic swells, aggressive drums, heavy sub-bass, harsh transients and long silence.`;

  let audio;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const interaction = await client.interactions.create({ model: 'lyria-3-clip-preview', input: prompt });
      audio = interaction.output_audio ?? interaction.outputAudio;
      if (!audio?.data) throw new Error('Lyria 응답에 오디오 데이터가 없습니다.');
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  if (!audio?.data) throw lastError;

  await mkdir(path.dirname(outputPath), { recursive: true });
  const rawPath = outputPath.replace(/\.mp3$/i, '.raw.mp3');
  await writeFile(rawPath, Buffer.from(audio.data, 'base64'));
  await run('ffmpeg', [
    '-y', '-i', rawPath,
    '-af', 'equalizer=f=2200:t=q:w=0.8:g=-2.5,loudnorm=I=-16:TP=-1.5:LRA=7',
    '-ar', '48000', '-codec:a', 'libmp3lame', '-q:a', '2', outputPath,
  ]);
  await rm(rawPath, { force: true });
  console.log(`✓ ${content.id} 음악 생성`);
}

const failed = [];
for (const content of contents) {
  try { await generate(content); }
  catch (error) {
    failed.push(content.id);
    console.error(`✗ ${content.id} 음악 실패: ${error.message}`);
  }
}
if (failed.length) throw new Error(`음악 생성 실패: ${failed.join(', ')}`);
