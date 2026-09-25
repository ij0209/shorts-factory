import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { SHORTS_FACTORY_V2_PROMPT } from './shortsFactoryV2Prompt.js';
import { CREATOR_TTS_PROMPT } from './creatorTtsPrompt.js';
import { parseGeneratedJson, validateGeneratedContent } from './contentSchema.js';
import { loadAllContents } from './loadContents.js';
import { loadLongformContents } from './contentCatalog.js';

export async function loadExistingContentIds(rootDir) {
  return (await loadAllContents(rootDir)).map(({ id }) => id);
}

export async function generateContentDraft({ rootDir, input }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 필요합니다.');
  const existingContents = await loadAllContents(rootDir);
  const existingContentIds = existingContents.map(({ id }) => id);
  const existingContentSummaries = existingContents
    .map(({ id, contentType, contentTrack, category, topic, title }) => ({ id, channel: contentType?.startsWith('life-margin') ? 'life-margin' : 'wemakevoice', contentTrack, category, topic, title }));
  const existingLongformSummaries = (await loadLongformContents(rootDir)).map((content) => {
    const { id, project, industry, category, topic, problemCluster, title, derivedFrom } = content;
    return { id, project, industry, category, topic, problemCluster, title, derivedFrom };
  });
  const request = { ...input, existingContentIds, existingContentSummaries, existingLongformSummaries };
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let content;
  let errors = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const correction = errors.length ? { previousValidationErrors: errors, instruction: '오류를 모두 고쳐 완전히 새로운 유효 JSON 객체 하나만 반환하라.' } : {};
    const response = await client.models.generateContent({
      model: process.env.GEMINI_CONTENT_MODEL || 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ ...request, ...correction }, null, 2) }] }],
      config: {
        systemInstruction: input.contentTrack === 'creator_tts' ? CREATOR_TTS_PROMPT : SHORTS_FACTORY_V2_PROMPT,
        responseMimeType: 'application/json',
        temperature: attempt === 1 ? 0.8 : 0.5,
      },
    });
    content = parseGeneratedJson(response.text ?? '');
    errors = validateGeneratedContent(content, existingContentIds, input);
    const normalizedTitle = content.title?.replace(/\s+/g, '').toLowerCase();
    if (normalizedTitle && [...existingContentSummaries, ...existingLongformSummaries]
      .some(({ title }) => title?.replace(/\s+/g, '').toLowerCase() === normalizedTitle)) {
      errors.push('title: 기존 숏츠 또는 롱폼 제목과 중복');
    }
    if (!errors.length) break;
  }
  if (errors.length) throw new Error(`3회 생성 후에도 콘텐츠 검증 실패:\n- ${errors.join('\n- ')}`);

  const draftsDir = path.join(rootDir, 'contents', 'drafts');
  const outputPath = path.join(draftsDir, `${content.id}.json`);
  const tempPath = `${outputPath}.tmp`;
  await mkdir(draftsDir, { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  await rename(tempPath, outputPath);
  return { content, outputPath };
}
