import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeConfig, normalizeYouTubeChannel, youtubeChannelForContent } from '../src/youtube/config.js';

test('콘텐츠의 기본 YouTube 채널은 wemakevoice다', () => {
  assert.equal(youtubeChannelForContent({}), 'wemakevoice');
  assert.equal(youtubeChannelForContent({ youtubeChannel: 'life-margin' }), 'life-margin');
});

test('지원하지 않는 채널 이름은 거부한다', () => {
  assert.throws(() => normalizeYouTubeChannel('wrong-channel'), /지원하지 않는 YouTube 채널/);
});

test('채널별 token, history, performance 경로가 겹치지 않는다', () => {
  const wemakevoice = getYouTubeConfig({ channel: 'wemakevoice' });
  const lifeMargin = getYouTubeConfig({ channel: 'life-margin' });
  assert.notEqual(wemakevoice.tokenPath, lifeMargin.tokenPath);
  assert.notEqual(wemakevoice.historyPath, lifeMargin.historyPath);
  assert.notEqual(wemakevoice.performancePath, lifeMargin.performancePath);
  assert.notEqual(wemakevoice.reportsDir, lifeMargin.reportsDir);
  assert.match(wemakevoice.tokenPath, /\.youtube-token-wemakevoice\.json$/);
  assert.match(lifeMargin.tokenPath, /\.youtube-token-life-margin\.json$/);
});
