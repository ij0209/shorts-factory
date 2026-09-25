function assTime(seconds) {
  const centiseconds = Math.round(seconds * 100);
  const h = Math.floor(centiseconds / 360000);
  const m = Math.floor((centiseconds % 360000) / 6000);
  const s = Math.floor((centiseconds % 6000) / 100);
  const cs = centiseconds % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(text) {
  return text.replaceAll('\\', '／').replaceAll('{', '（').replaceAll('}', '）').replaceAll('\n', '\\N');
}

export function splitSentences(text) {
  return text.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [text];
}

const dependentStarts = new Set([
  '대로', '동안', '되는', '등', '않도록', '위해', '있게', '주시고', '주시기',
  '주세요', '한번', '후', '여러분께', '예정입니다', '바랍니다', '것은', '것이',
  '것을', '수', '때문에', '처럼', '만큼', '보다', '까지', '부터', '에게',
  '으로', '하며', '해서', '라고', '이라는', '와', '과',
]);

const naturalStarts = new Set([
  '하지만', '그러나', '그래서', '그리고', '다만', '이제', '또한', '오히려',
  '대신', '때로는', '그런데', '그러므로', '그렇지만',
]);

// 관형사·수관형사는 뒤의 명사와 한 의미 단위이므로 줄 끝에 홀로 두지 않는다.
const nounModifiers = new Set([
  '한', '두', '세', '네', '첫', '모든', '어떤', '무슨', '어느', '각', '몇',
  '이', '그', '저', '새', '온', '매',
]);

function startsWithDependentWord(text) {
  return dependentStarts.has(text.split(' ')[0]);
}

export function wrapKoreanCaption(text, maxLineLength = 12) {
  if ([...text].length <= maxLineLength || !text.includes(' ')) return text;
  const words = text.split(' ');
  const units = [];
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (nounModifiers.has(word) && words[index + 1]) {
      units.push(`${word} ${words[++index]}`);
    } else if (startsWithDependentWord(word) && units.length) {
      units[units.length - 1] += ` ${word}`;
    } else {
      units.push(word);
    }
  }
  const lines = [];
  let lineUnits = [];
  for (const unit of units) {
    const candidate = [...lineUnits, unit].join(' ');
    if (lineUnits.length && [...candidate].length > maxLineLength) {
      lines.push(lineUnits);
      lineUnits = [unit];
    } else {
      lineUnits.push(unit);
    }
  }
  if (lineUnits.length) lines.push(lineUnits);
  if (lines.length > 1) {
    const last = lines.at(-1);
    const previous = lines.at(-2);
    while ([...last.join(' ')].length < 6 && previous.length > 1) {
      last.unshift(previous.pop());
    }
  }
  return lines.map((line) => line.join(' ')).join('\n');
}

function koreanBoundaryPenalty(left, right) {
  const next = right.split(' ')[0];
  const previous = left.split(' ').at(-1);
  if (startsWithDependentWord(right)) return 1200;
  if (nounModifiers.has(previous)) return 1200;
  if (/[,.，]$/.test(left)) return -600;
  if (naturalStarts.has(next)) return -450;
  if (/(지만|는데|이며|면서|므로|어서|아서|수록|면|때|고)$/.test(left)) return -420;
  return 0;
}

export function balanceKoreanCaption(text, maxLineLength = 20) {
  if ([...text].length <= maxLineLength || !text.includes(' ')) return text;
  const spaces = [...text.matchAll(/ /g)].map(({ index }) => index);
  const candidates = spaces
    .map((index) => ({
      index,
      left: text.slice(0, index).trim(),
      right: text.slice(index + 1).trim(),
    }))
    .filter(({ left, right }) => [...left].length >= 5 && [...right].length >= 5)
    .filter(({ left, right }) => [...left].length <= maxLineLength && [...right].length <= maxLineLength);
  if (!candidates.length) return text;
  const best = candidates.sort((a, b) => {
    const aDiff = Math.abs([...a.left].length - [...a.right].length) + koreanBoundaryPenalty(a.left, a.right);
    const bDiff = Math.abs([...b.left].length - [...b.right].length) + koreanBoundaryPenalty(b.left, b.right);
    return aDiff - bDiff;
  })[0];
  return `${best.left}\n${best.right}`;
}

export function splitCaptionChunks(sentence, preferredLength = 30, maxLength = 34) {
  if ([...sentence].length <= maxLength) return [sentence];
  const words = sentence.split(' ');
  const groupCount = Math.ceil([...sentence].length / preferredLength);
  const targetLength = [...sentence].length / groupCount;
  const memo = new Map();

  const solve = (start, groupsLeft) => {
    const key = `${start}:${groupsLeft}`;
    if (memo.has(key)) return memo.get(key);
    if (groupsLeft === 1) {
      const text = words.slice(start).join(' ');
      const length = [...text].length;
      const result = length <= maxLength
        ? { chunks: [text], cost: (length - targetLength) ** 2 + (length < 8 ? 1000 : 0) }
        : null;
      memo.set(key, result);
      return result;
    }

    let best = null;
    for (let end = start + 1; end <= words.length - groupsLeft + 1; end++) {
      const text = words.slice(start, end).join(' ');
      const length = [...text].length;
      if (length > maxLength) break;
      const rest = solve(end, groupsLeft - 1);
      if (!rest) continue;
      const nextText = words.slice(end).join(' ');
      const cost = rest.cost + (length - targetLength) ** 2
        + (length < 8 ? 1000 : 0)
        + koreanBoundaryPenalty(text, nextText);
      if (!best || cost < best.cost) best = { chunks: [text, ...rest.chunks], cost };
    }
    memo.set(key, best);
    return best;
  };

  return solve(0, groupCount)?.chunks ?? [sentence];
}

export function createCaptions({ narration, audioDuration, startAt = 2 }) {
  const sentences = splitSentences(narration).flatMap((sentence) => splitCaptionChunks(sentence));
  const weights = sentences.map((sentence) => Math.max([...sentence].length, 8));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let cursor = startAt;

  return sentences.map((text, index) => {
    const end = index === sentences.length - 1
      ? startAt + audioDuration
      : cursor + audioDuration * weights[index] / weightTotal;
    const caption = { text: balanceKoreanCaption(text), start: cursor, end };
    cursor = end;
    return caption;
  });
}

function wrap(text, length = 20) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && [...`${line} ${word}`].length > length) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.join('\\N');
}

export function createAss({ content, audioDuration, introDuration = 2.5, outroDuration = 2.5 }) {
  const total = introDuration + audioDuration + outroDuration;
  const sentences = splitSentences(content.narration);
  const weights = sentences.map((sentence) => Math.max([...sentence].length, 8));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  let cursor = introDuration;
  const events = [];

  events.push(`Dialogue: 0,${assTime(0)},${assTime(introDuration)},Hook,,0,0,0,,${escapeAss(wrap(content.hook, 16))}`);
  sentences.forEach((sentence, index) => {
    const end = index === sentences.length - 1 ? introDuration + audioDuration : cursor + audioDuration * weights[index] / weightTotal;
    events.push(`Dialogue: 0,${assTime(cursor)},${assTime(end)},Subtitle,,0,0,0,,${escapeAss(wrap(sentence, 21))}`);
    cursor = end;
  });
  const brand = content.brandText ?? '안내방송 자동화, 위메이크보이스';
  const website = content.website ?? 'wemakevoice.com';
  events.push(`Dialogue: 0,${assTime(total - outroDuration)},${assTime(total)},Outro,,0,0,0,,${escapeAss(brand)}\\N${escapeAss(website)}`);

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Hook,Apple SD Gothic Neo,78,&H00FFFFFF,&H000000FF,&H00000000,&H88000000,-1,0,0,0,100,100,0,0,3,4,0,5,90,90,0,1\nStyle: Subtitle,Apple SD Gothic Neo,68,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,3,4,0,2,90,90,440,1\nStyle: Outro,Apple SD Gothic Neo,66,&H00FFFFFF,&H000000FF,&H00000000,&H88000000,-1,0,0,0,100,100,0,0,3,4,0,5,80,80,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join('\n')}\n`;
}
