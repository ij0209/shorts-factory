import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roundName = process.argv.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const onlyId = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5);
const round = path.join(root, 'projects/dawn_verse/rounds', roundName);
await loadEnv(path.join(root, '.env'));
const { contents } = JSON.parse(await readFile(path.join(round, 'contents.json'), 'utf8'));
const parts = [{ text: `아래에는 한국어 음성 10개가 ID와 함께 제공됩니다. 각 음성을 끝까지 듣고 기도 마지막 문장과 “아멘” 사이의 실제 시간 경계를 분석하세요.

각 ID마다 다음 값을 초 단위 소수 둘째 자리까지 반환하세요.
- prayerEnd: “아멘” 직전 기도 문장의 마지막 발성이 끝나는 시각
- amenStart: “아멘”의 첫 발성이 시작되는 시각
- ctaStart: 아멘 뒤 CTA가 있으면 그 첫 발성 시각, 없으면 null
- spokenAmen: 실제로 아멘이 들리면 true

음성 파일 전체 길이가 아니라 파형의 발성 시점을 기준으로 측정하세요. strict JSON 객체로만 답하세요. 최상위 키는 items이고 배열 항목은 id, prayerEnd, amenStart, ctaStart, spokenAmen입니다.` }];
for (const content of contents.filter((item) => !onlyId || item.id === onlyId)) {
  parts.push({ text: `ID: ${content.id}\n기도 원고: ${content.prayer}\nCTA: ${content.cta || '(없음)'}` });
  parts.push({ inlineData: { mimeType: 'audio/mpeg', data: (await readFile(path.join(round, 'audio', `${content.id}.mp3`))).toString('base64') } });
}
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.models.generateContent({
  model: process.env.GEMINI_CONTENT_MODEL || 'gemini-3.6-flash',
  contents: [{ role: 'user', parts }],
  config: { responseMimeType: 'application/json' },
});
const result = JSON.parse(response.text);
await writeFile(path.join(round, 'amen_timing_analysis.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
