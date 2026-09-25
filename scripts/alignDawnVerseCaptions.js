import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { loadEnv } from '../src/utils/loadEnv.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const roundName = args.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const onlyId = args.find((arg) => arg.startsWith('--id='))?.slice(5);
const round = path.join(root, 'projects/dawn_verse/rounds', roundName);
const introPause = 0.7;

await loadEnv(path.join(root, '.env'));
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 없습니다.');
const { contents } = JSON.parse(await readFile(path.join(round, 'contents.json'), 'utf8'));
const amenAnalysis = JSON.parse(await readFile(path.join(round, 'amen_timing_analysis.json'), 'utf8')).items || [];
const alignedDir = path.join(round, 'subtitles/aligned');
const auditDir = path.join(round, 'subtitles/alignment-audit');
await mkdir(alignedDir, { recursive: true });
await mkdir(auditDir, { recursive: true });
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function validate(source, aligned, duration) {
  if (!Array.isArray(aligned) || aligned.length !== source.length) throw new Error(`자막 수 불일치: ${aligned?.length}/${source.length}`);
  let previousEnd = 0;
  const normalized = aligned.map((item, index) => {
    if (item.index !== index || item.heard !== true) throw new Error(`${index}번 자막을 음성에서 확인하지 못했습니다.`);
    const start = Number(item.start);
    const end = Number(item.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration + 0.35) throw new Error(`${index}번 시간값 오류`);
    if (start + 0.12 < previousEnd) throw new Error(`${index}번 자막 시간이 앞 자막과 역전됩니다.`);
    previousEnd = end;
    return { ...source[index], start: Math.max(introPause, start + introPause - 0.06), end: end + introPause + 0.08, alignment: 'gemini-audio-verified' };
  });
  for (let index = 1; index < normalized.length; index++) {
    if (normalized[index - 1].end > normalized[index].start) {
      const boundary = (normalized[index - 1].end + normalized[index].start) / 2;
      normalized[index - 1].end = boundary;
      normalized[index].start = boundary;
    }
  }
  return normalized;
}

for (const content of contents.filter((item) => !onlyId || item.id === onlyId)) {
  const sourcePath = path.join(round, 'subtitles', `${content.id}.json`);
  const audioPath = path.join(round, 'audio', `${content.id}.mp3`);
  const source = JSON.parse(await readFile(sourcePath, 'utf8')).map(({ type, text }) => ({ type, text }));
  const duration = Number((await import('../src/generateAudio.js')).getAudioDuration ? await (await import('../src/generateAudio.js')).getAudioDuration(audioPath) : 0);
  const list = source.map((item, index) => `${index}. [${item.type}] ${item.text}`).join('\n');
  const response = await client.models.generateContent({
    model: process.env.GEMINI_CONTENT_MODEL || 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [
      { text: `이 한국어 음성을 처음부터 끝까지 실제로 듣고, 아래 자막 조각 각각에 대응하는 발화의 시작과 끝을 초 단위 소수 둘째 자리로 정렬하세요. 이 음성의 전체 길이는 ${duration.toFixed(2)}초입니다. 모든 end 값은 반드시 ${duration.toFixed(2)} 이하이어야 합니다.

규칙:
- 추측하거나 글자 수로 균등 배분하지 말고 실제 발음을 기준으로 측정합니다.
- 쉼은 앞뒤 자막에 억지로 포함하지 않습니다.
- 같은 순서와 같은 개수로 반환합니다.
- 해당 문구가 실제로 들릴 때만 heard=true입니다.
- 원고가 생략되거나 바뀌어 정확히 대응하지 않으면 heard=false입니다.
- JSON 최상위 키는 items이며 각 항목은 index, start, end, heard만 포함합니다.

자막 목록:
${list}` },
      { inlineData: { mimeType: 'audio/mpeg', data: (await readFile(audioPath)).toString('base64') } },
    ] }],
    config: { responseMimeType: 'application/json' },
  });
  const result = JSON.parse(response.text);
  const candidate = result.items || result.captions || result.segments || (Array.isArray(result) ? result : null);
  if (!candidate) throw new Error(`정렬 응답 형식 오류: ${JSON.stringify(result).slice(0, 500)}`);
  const verifiedAmen = amenAnalysis.find((item) => item.id === content.id && item.spokenAmen);
  const amenIndex = source.findIndex((item) => item.type === 'amen');
  if (verifiedAmen && amenIndex >= 0 && candidate[amenIndex]?.heard !== true) {
    candidate[amenIndex] = { index: amenIndex, start: verifiedAmen.amenStart, end: Math.min(duration, verifiedAmen.ctaStart ? verifiedAmen.ctaStart - 0.35 : duration), heard: true };
    if (candidate[amenIndex - 1]?.end >= verifiedAmen.amenStart) candidate[amenIndex - 1].end = verifiedAmen.amenStart - 0.12;
  }
  await writeFile(path.join(auditDir, `${content.id}.json`), JSON.stringify(candidate, null, 2) + '\n');
  let aligned;
  try { aligned = validate(source, candidate, duration); }
  catch (error) {
    console.error(`✗ ${content.id}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  await writeFile(path.join(alignedDir, `${content.id}.json`), JSON.stringify(aligned, null, 2) + '\n');
  console.log(`✓ ${content.id} 실제 음성 기준 ${aligned.length}개 자막 정렬`);
}
