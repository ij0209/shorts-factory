import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await loadEnv(path.join(rootDir, '.env'));
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 필요합니다.');

const prompt = `Create a polished 30-second instrumental background track for Korean YouTube Shorts that demonstrate useful public-address announcement scripts for shops, apartments, and campgrounds.

Musical direction:
- modern warm lo-fi corporate groove, tasteful and current rather than generic stock music
- around 92 BPM, major key with gentle major-7 harmony
- soft muted electric guitar or clean pluck, warm Rhodes texture, subtle rounded bass, restrained shaker and light kick
- an immediately pleasant groove from the first second, with no long intro
- calm, helpful, trustworthy, lightly upbeat mood that supports useful business-tip content
- sparse midrange arrangement so a Korean female narration remains perfectly clear
- one small memorable instrumental motif, but never attention-grabbing
- smooth, loop-friendly ending with no dramatic finale

Instrumental only, no vocals, no spoken words, no chanting.
Avoid bells, chimes, ukulele, cinematic swells, orchestral strings, trap hi-hats, heavy sub-bass, aggressive drums, cheesy advertising jingles, childish sounds, sad mood, dramatic transitions, and silence.`;

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const interaction = await client.interactions.create({
  model: 'lyria-3-clip-preview',
  input: prompt,
});
const audio = interaction.output_audio ?? interaction.outputAudio;
if (!audio?.data) throw new Error('Lyria 응답에 오디오 데이터가 없습니다.');

const outputPath = path.join(rootDir, 'public', 'music', 'shorts-ai-bgm-raw.mp3');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.from(audio.data, 'base64'));
console.log(outputPath);
