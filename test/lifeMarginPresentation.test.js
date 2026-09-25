import test from 'node:test';
import assert from 'node:assert/strict';
import { createCaptions, wrapKoreanCaption } from '../src/generateSubtitle.js';
import { getContentProfile, resolveVoiceName } from '../src/contentTypes/profiles.js';

test('삶의여백 신규 콘텐츠는 번호 순서대로 남녀 목소리를 교차한다', () => {
  const profile = getContentProfile({ contentType: 'life-margin' });
  const voice = (id) => resolveVoiceName({ id, contentType: 'life-margin' }, profile);
  assert.deepEqual([
    voice('life-margin-next-001'),
    voice('life-margin-next-002'),
    voice('life-margin-next-003'),
    voice('life-margin-next-004'),
  ], ['Charon', 'Aoede', 'Charon', 'Aoede']);
});

test('명시한 목소리는 자동 교차보다 우선한다', () => {
  const profile = getContentProfile({ contentType: 'life-margin' });
  assert.equal(resolveVoiceName({ id: 'life-margin-next-001', contentType: 'life-margin', voiceName: 'Aoede' }, profile), 'Aoede');
});

test('한국어 자막은 조사나 의존 표현 앞보다 의미 경계를 우선한다', () => {
  const captions = createCaptions({
    narration: '자식이 실수할까 걱정되지만 대신 정해주는 것은 좋은 방법이 아닙니다.',
    audioDuration: 10,
    startAt: 0,
  });
  assert.deepEqual(captions.map(({ text }) => text), [
    '자식이 실수할까 걱정되지만',
    '대신 정해주는 것은\n좋은 방법이 아닙니다.',
  ]);
});

test('조건절은 다음 핵심 문장과 뒤섞지 않고 자연스럽게 줄을 나눈다', () => {
  const [caption] = createCaptions({
    narration: '관계가 멀어질수록 작은 말에도 쉽게 상처를 받습니다.',
    audioDuration: 6,
    startAt: 0,
  });
  assert.equal(caption.text, '관계가 멀어질수록\n작은 말에도 쉽게 상처를 받습니다.');
});

test('수관형사와 명사를 서로 다른 자막 줄로 나누지 않는다', () => {
  const [caption] = createCaptions({
    narration: '지금 할 수 있는 한 걸음을 오늘 차분하게 걸어보세요.',
    audioDuration: 6,
    startAt: 0,
  });
  assert.equal(caption.text.includes('한\n걸음을'), false);
  assert.match(caption.text, /한 걸음을/);
  assert.equal(wrapKoreanCaption('지금 할 수 있는 한 걸음에 마음을 두세요.', 12), '지금 할 수 있는\n한 걸음에\n마음을 두세요.');
});
