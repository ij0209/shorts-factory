import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await loadEnv(path.join(rootDir, '.env'));
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const candidates = process.argv.slice(2);
if (candidates.length < 2) throw new Error('비교할 음악 파일 2개가 필요합니다.');

const parts = [{
  text: `You are an exacting music supervisor for Korean YouTube Shorts. Compare the attached AI-generated instrumental candidates for 20-25 second videos demonstrating useful public-address scripts for shops, apartments, and campgrounds. A Korean female narration is the primary content.

Evaluate each candidate on:
1. immediate but tasteful Shorts appeal in the first 2 seconds
2. modern, likable production rather than cheesy stock advertising
3. low interference with clear Korean female narration
4. suitability across retail, residential, and campground content
5. editability and loopability for 20-25 second videos
6. absence of vocals, speech, distracting lead melodies, harsh transients, and excessive bass

Return strict JSON with: candidates (name, scores from 1-10 for each criterion, detected style/instruments, vocalsDetected, specificRisks), winner, and conciseMixRecommendation. Be critical; do not assume either is good.`,
}];

for (const candidate of candidates) {
  parts.push({ text: `Candidate: ${path.basename(candidate)}` });
  parts.push({ inlineData: { mimeType: 'audio/mpeg', data: (await readFile(candidate)).toString('base64') } });
}

const response = await client.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [{ role: 'user', parts }],
  config: { responseMimeType: 'application/json' },
});
console.log(response.text);
