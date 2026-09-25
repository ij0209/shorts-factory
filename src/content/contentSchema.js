const REQUIRED_STRINGS = [
  'id', 'category', 'topic', 'title', 'hookType', 'experimentGroup', 'hook',
  'narration', 'backgroundPrompt', 'bgmPrompt', 'youtubeTitle', 'youtubeDescription',
];
const HOOK_TYPES = new Set(['default', 'situation', 'manager_problem', 'broadcast_first']);
const CREATOR_HOOK_TYPES = new Set(['problem', 'result_first', 'before_after', 'question', 'comparison']);

export function validateGeneratedContent(content, existingContentIds = [], expected = {}) {
  const errors = [];
  if (!content || typeof content !== 'object' || Array.isArray(content)) return ['결과가 JSON 객체가 아님'];
  for (const key of REQUIRED_STRINGS) {
    if (typeof content[key] !== 'string' || !content[key].trim()) errors.push(`${key}: 비어 있거나 문자열이 아님`);
  }
  if (!Array.isArray(content.youtubeTags)) errors.push('youtubeTags: 배열이 아님');
  else {
    if (content.youtubeTags.length < 5 || content.youtubeTags.length > 10) errors.push('youtubeTags: 5~10개 필요');
    if (content.youtubeTags.some((tag) => typeof tag !== 'string' || !tag.trim())) errors.push('youtubeTags: 빈 값 또는 문자열 아닌 항목 존재');
    if (!content.youtubeTags.includes('WeMakeVoice')) errors.push('youtubeTags: WeMakeVoice 필요');
  }
  if (content.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(content.id)) errors.push('id: 영어 소문자·숫자·하이픈만 허용');
  if (existingContentIds.includes(content.id)) errors.push(`id: 기존 콘텐츠와 중복 (${content.id})`);
  if (content.category && !/^[a-z]+(?:_[a-z]+)*$/.test(content.category)) errors.push('category: 영어 소문자 snake_case 필요');
  if (content.topic && !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(content.topic)) errors.push('topic: 영어 소문자 snake_case 필요');
  const creator = content.contentTrack === 'creator_tts';
  if (content.contentTrack != null && !['announcement', 'creator_tts'].includes(content.contentTrack)) errors.push('contentTrack: 허용되지 않은 값');
  if (creator && content.contentType !== 'creator_tts') errors.push('contentType: creator_tts 필요');
  if (content.hookType && !(creator ? CREATOR_HOOK_TYPES : HOOK_TYPES).has(content.hookType)) errors.push('hookType: 허용되지 않은 값');
  if (content.experimentGroup && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(content.experimentGroup)) errors.push('experimentGroup: 영어 소문자·숫자·하이픈만 허용');
  if (content.hook) {
    const lines = content.hook.split('\n');
    if (lines.length > 2) errors.push('hook: 최대 2줄');
    if (lines.some((line) => [...line].length > 22)) errors.push('hook: 각 줄은 공백 포함 22자 이하여야 함');
  }
  if (content.title && /#shorts/i.test(content.title)) errors.push('title: #shorts 금지');
  if (!creator && content.narration && /wemake\s*voice|wemakevoice\.com/i.test(content.narration)) errors.push('narration: 브랜드·CTA 금지');
  if (!creator && content.experimentId !== 'wmv-round2-dual-track' && content.youtubeDescription && !content.youtubeDescription.includes('🎙 안내방송 음성 : WeMakeVoice\nwemakevoice.com')) {
    errors.push('youtubeDescription: 필수 브랜드 표기 누락 또는 형식 오류');
  }
  if (content.experimentId === 'wmv-round2-dual-track' && content.youtubeDescription &&
      (!content.youtubeDescription.includes('www.wemakevoice.com') || !content.youtubeDescription.includes('채널 프로필'))) {
    errors.push('youtubeDescription: Round 2는 프로필 안내와 웹사이트 주소가 필요');
  }
  if (creator) {
    for (const key of ['creatorType', 'useCase', 'painPoint', 'experimentId']) {
      if (typeof content[key] !== 'string' || !content[key].trim()) errors.push(`${key}: creator_tts 필수 metadata`);
    }
    if (content.youtubeDescription && !content.youtubeDescription.includes('wemakevoice.com')) errors.push('youtubeDescription: 웹사이트 누락');
  }
  if (Array.isArray(content.youtubeTags) && ['WeMakeVoice', 'shorts'].includes(content.youtubeTags[0])) {
    errors.push('youtubeTags: 첫 태그는 장소·상황의 핵심 검색어여야 함');
  }
  for (const key of ['category', 'topic', 'hookType', 'experimentGroup', 'contentTrack', 'creatorType', 'useCase', 'painPoint', 'experimentId']) {
    if (expected[key] && content[key] !== expected[key]) errors.push(`${key}: 입력값 ${expected[key]}을 그대로 사용해야 함`);
  }
  return errors;
}

export function parseGeneratedJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed); }
  catch (error) { throw new Error(`Gemini 결과가 유효한 JSON이 아닙니다: ${error.message}`); }
}
