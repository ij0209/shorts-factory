import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
await loadEnv(path.join(rootDir, '.env'));
const videoPath = process.argv[2];
if (!videoPath) throw new Error('검수할 삶의여백 MP4 경로가 필요합니다.');
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.models.generateContent({
  model: process.env.GEMINI_CONTENT_MODEL || 'gemini-3.6-flash',
  contents: [{ role: 'user', parts: [
    { text: `You are a strict Korean YouTube Shorts editor reviewing the complete first episode of the channel "삶의 여백", aimed mainly at viewers aged 50-70. The concept is calm, useful life wisdom centered on a real viewer concern, not a generic AI quote video.

Watch and listen from start to finish. Evaluate with concrete timestamp evidence: first-3-second retention hook, mature Korean TTS naturalness and pacing, whether every spoken word matches the script, large Korean caption readability and safe-area placement, caption timing, B-roll realism and semantic fit, smooth zoom/pan and cross-dissolve continuity, BGM quality and narration interference, emotional authenticity versus generic AI content, outro restraint, and technical 9:16 publish readiness. Also flag any fake quotation or unsupported attribution.

Return strict JSON with scores from 1-10 for each criterion, blockingIssues, nonBlockingNotes, strongestMoment, weakestMoment, and verdict as publish or revise. Do not approve by default.` },
    { inlineData: { mimeType: 'video/mp4', data: (await readFile(videoPath)).toString('base64') } },
  ] }],
  config: { responseMimeType: 'application/json' },
});
console.log(response.text);
