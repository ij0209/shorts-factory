import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeneratedJson, validateGeneratedContent } from '../src/content/contentSchema.js';

const valid = {
  id: 'mart-closing-002', category: 'mart', topic: 'closing_10min',
  title: '마트 영업 종료 10분 전 안내방송', hookType: 'situation',
  experimentGroup: 'mart-closing-exp01', hook: '폐점 10분 전인데\n손님이 안 나갈 때',
  narration: '고객 여러분께 안내 말씀드립니다. 저희 매장은 10분 후 영업을 종료합니다. 구매하실 상품을 확인하시고 계산대를 이용해 주시기 바랍니다.',
  backgroundPrompt: 'Realistic vertical view inside a calm Korean supermarket near closing, no text or logos, clean center composition.',
  bgmPrompt: 'Soft minimal instrumental with warm keys and restrained percussion, no vocals or dramatic changes.',
  youtubeTitle: '폐점 10분 전인데 손님이 안 나갈 때 쓰는 마트 안내방송 #shorts',
  youtubeDescription: '마트 폐점 10분 전 사용할 수 있는 안내방송입니다.\n\n🎙 안내방송 음성 : WeMakeVoice\nwemakevoice.com\n\n#마트안내방송 #폐점방송 #shorts',
  youtubeTags: ['마트 안내방송', '마트 폐점', '영업 종료', '마감 방송', '매장 관리자', 'WeMakeVoice', 'shorts'],
};

test('Shorts Factory 2.0 결과 스키마를 검증한다', () => {
  assert.deepEqual(validateGeneratedContent(valid, ['mart-closing-001']), []);
});

test('중복 ID, 잘못된 Hook, narration 브랜드 삽입을 거부한다', () => {
  const errors = validateGeneratedContent({ ...valid, id: 'mart-closing-001', hook: 'a\nb\nc', narration: 'WeMakeVoice를 사용하세요.' }, ['mart-closing-001']);
  assert(errors.some((error) => error.startsWith('id: 기존')));
  assert(errors.some((error) => error.startsWith('hook:')));
  assert(errors.some((error) => error.startsWith('narration:')));
});

test('Hook 줄 길이와 입력 실험값 변경을 거부한다', () => {
  const errors = validateGeneratedContent({ ...valid, category: 'hotel', hook: '공백 포함 스물두 글자를 훨씬 넘어서 읽기 어려운 첫 화면 문장입니다' }, [], { category: 'mart' });
  assert(errors.some((error) => error.includes('22자')));
  assert(errors.some((error) => error.startsWith('category: 입력값')));
});

test('JSON 코드펜스가 섞여도 안전하게 파싱한다', () => {
  assert.equal(parseGeneratedJson('```json\n{"id":"x"}\n```').id, 'x');
});
