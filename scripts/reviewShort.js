import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await loadEnv(path.join(rootDir, '.env'));
const videoPath = process.argv[2];
const contentName = process.argv[3] ?? path.basename(videoPath);
if (!videoPath) throw new Error('검수할 영상 파일이 필요합니다.');

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: [{ role: 'user', parts: [
    { text: `Act as a strict Korean YouTube Shorts editor and audio mixer. Review this complete video: ${contentName}. The goal is to make viewers think the announcement script is useful for their own business, while WeMakeVoice branding remains subtle.

Inspect the actual video and audio from start to finish. Score 1-10 and explain concrete evidence for: first-2-second hook, background realism and motion smoothness, Korean caption readability/timing/safe-area placement, Aoede narration clarity/naturalness, AI background music suitability and narration interference, pacing and retention potential, brand restraint, outro effectiveness, and technical publish readiness. Flag any hallucinated or mismatched spoken content if detectable. Return strict JSON with scores, blockingIssues, nonBlockingNotes, and verdict (publish / revise). Be critical and do not approve by default.` },
    { inlineData: { mimeType: 'video/mp4', data: (await readFile(videoPath)).toString('base64') } },
  ] }],
  config: { responseMimeType: 'application/json' },
});
console.log(response.text);
