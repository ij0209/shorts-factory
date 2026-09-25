import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';
import { run } from '../src/utils/process.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await loadEnv(path.join(root, '.env'));
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 필요합니다.');
const target = path.join(root, 'public/music/dawn-verse/dawn-prayer-piano-002.mp3');
const raw = target.replace('.mp3', '.raw.mp3');
const prompt = `Create an original instrumental background cue for a Korean Protestant Christian dawn devotional channel called “A Verse at Dawn”.

Musical direction:
- 30-second seamless-loop-friendly cue, 58–64 BPM, spacious and reverent
- intimate felt piano with very sparse notes, a soft warm ambient pad, and an almost imperceptible low cello texture
- the feeling of entering a quiet church before sunrise: mature faith, prayer, consolation, and steady hope
- begin gently from the first second without a dramatic intro; maintain restrained dynamics throughout
- leave the speech midrange very open so a deep Korean male pastor narration stays completely clear
- end softly without a cadence or climax so looping is natural

Instrumental only. No vocals, choir, chanting, spoken words, bells, chimes, organ, drums, percussion, recognizable hymn melody, sentimental flourish, cinematic swell, trailer sound, or heavy bass.`;
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const interaction = await client.interactions.create({ model: 'lyria-3-clip-preview', input: prompt });
const audio = interaction.output_audio ?? interaction.outputAudio;
if (!audio?.data) throw new Error('Lyria 응답에 오디오 데이터가 없습니다.');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(raw, Buffer.from(audio.data, 'base64'));
await run('ffmpeg', ['-y', '-i', raw, '-af', 'highpass=f=45,equalizer=f=2200:t=q:w=0.8:g=-3,loudnorm=I=-20:TP=-2:LRA=5', '-ar', '48000', '-codec:a', 'libmp3lame', '-q:a', '2', target]);
await rm(raw, { force: true });
console.log(target);
