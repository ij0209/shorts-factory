import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roundName = process.argv.find((arg) => arg.startsWith('--round='))?.slice(8) || 'DAWN_VERSE_ROUND_1A';
const contentsPath = path.join(root, 'projects/dawn_verse/rounds', roundName, 'contents.json');
const source = JSON.parse(await readFile(contentsPath, 'utf8'));

function compactTag(value) {
  return value.replaceAll(/[\s/:·|()[\],]+/g, '');
}

for (const content of source.contents) {
  const oldDescription = content.youtubeDescription || '';
  const context = oldDescription.match(/본문 문맥:\s*(.+?)(?:\n\n|$)/s)?.[1]?.trim()
    || content.context_note
    || '본문의 앞뒤 흐름을 함께 살피며 오늘의 삶에 적용합니다.';
  const transcript = [
    `[도입] ${content.hook}`,
    `[말씀 낭독] ${content.verse_excerpt}`,
    `[묵상] ${content.reflection}`,
    `[기도] ${content.prayer}`,
    content.cta ? `[마무리] ${content.cta}` : null,
  ].filter(Boolean).join('\n');
  const bookTag = compactTag(content.book);
  const topicTag = compactTag(content.topic);
  const referenceTag = `${bookTag}${content.chapter}장${content.verse_start}절`;
  const hashtags = [
    '#새벽한구절', '#오늘의말씀', '#성경말씀', '#아침기도', `#${bookTag}`, `#${topicTag}`,
  ].join(' ');

  content.narration = [content.hook, content.verse_excerpt, content.reflection, content.prayer, content.cta].filter(Boolean).join(' ');
  content.youtubeTitle = `${content.title.replace(/\s*\|\s*새벽한구절$/, '')} | ${content.bible_reference} | 새벽한구절`;

  content.youtubeDescription = `${content.hook}

🎙️ 영상 자막 전체
${transcript}

📖 오늘의 성경 말씀 — ${content.bible_reference}
“${content.bible_text}”

영상에서 낭독한 구절:
“${content.verse_excerpt}”

📚 본문 정보
번역: Korean Bible 1910 (KOROLD)
원문: ${content.verse_source}
이용 조건: eBible.org가 Public Domain으로 표시한 1910 한국어 성경

🕊️ 본문 문맥과 오늘의 적용
${context}

오늘의 묵상:
${content.reflection}

오늘의 기도:
${content.prayer}

매일 새벽 5시, 하루를 여는 말씀 한 구절.

${hashtags}`;

  content.youtubeTags = [...new Set([
    '새벽한구절', '오늘의말씀', '성경말씀', '아침기도', '새벽기도',
    '아침묵상', '성경묵상', '말씀묵상', '기도문', '기독교쇼츠',
    content.book, content.bible_reference, referenceTag, content.topic, content.subtopic,
  ].filter(Boolean))];
}

await writeFile(contentsPath, JSON.stringify(source, null, 2) + '\n');
console.log(`상세 설명·태그 준비 완료: ${source.contents.length}편`);
