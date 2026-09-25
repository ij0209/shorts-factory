import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptionWithTracking, trackingUrlForContent } from '../src/youtube/tracking.js';

test('WeMakeVoice Shorts에 영상별 UTM 링크를 만든다', () => {
  const content = { id: 'mart-closing-001', category: 'mart', contentType: 'announcement' };
  assert.equal(trackingUrlForContent(content), 'https://wemakevoice.com/priceAnnounce?utm_source=youtube&utm_medium=shorts&utm_campaign=mart&utm_content=mart-closing-001');
  assert.match(descriptionWithTracking(content, '설명\n\nwemakevoice.com'), /utm_content=mart-closing-001/);
});

test('삶의여백 설명에는 WeMakeVoice 전환 링크를 추가하지 않는다', () => {
  const content = { id: 'life-margin-001', youtubeChannel: 'life-margin' };
  assert.equal(descriptionWithTracking(content, '설명'), '설명');
});
