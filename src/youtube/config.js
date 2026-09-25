import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IANAZone } from 'luxon';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const YOUTUBE_CHANNELS = ['wemakevoice', 'life-margin', 'dawn-verse'];

export function normalizeYouTubeChannel(value = 'wemakevoice') {
  const aliases = { announcement: 'wemakevoice', 'life_margin': 'life-margin', dawn_verse: 'dawn-verse' };
  const channel = aliases[value] || value;
  if (!YOUTUBE_CHANNELS.includes(channel)) {
    throw new Error(`지원하지 않는 YouTube 채널: ${value}`);
  }
  return channel;
}

export function youtubeChannelForContent(content) {
  return normalizeYouTubeChannel(content.youtubeChannel || 'wemakevoice');
}

function integer(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} 값은 ${min}~${max} 사이의 정수여야 합니다.`);
  }
  return value;
}

export function getYouTubeConfig({ requireOAuth = false, channel = 'wemakevoice' } = {}) {
  const channelKey = normalizeYouTubeChannel(channel);
  const prefix = { wemakevoice: 'WEMAKEVOICE', 'life-margin': 'LIFE_MARGIN', 'dawn-verse': 'DAWN_VERSE' }[channelKey];
  const timezone = process.env.YOUTUBE_TIMEZONE || 'Asia/Seoul';
  if (!IANAZone.isValidZone(timezone)) throw new Error(`유효하지 않은 YOUTUBE_TIMEZONE: ${timezone}`);

  const config = {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://127.0.0.1:3000/oauth2callback',
    channel: channelKey,
    channelId: process.env[`${prefix}_YOUTUBE_CHANNEL_ID`] || '',
    autoUpload: process.env[`${prefix}_YOUTUBE_AUTO_UPLOAD`] === 'true',
    defaultPrivacy: process.env.YOUTUBE_DEFAULT_PRIVACY || 'private',
    timezone,
    publishHour: integer(`${prefix}_YOUTUBE_PUBLISH_HOUR`, channelKey === 'wemakevoice' ? 19 : channelKey === 'dawn-verse' ? 5 : 20, 0, 23),
    publishMinute: integer(`${prefix}_YOUTUBE_PUBLISH_MINUTE`, channelKey === 'life-margin' ? 30 : 0, 0, 59),
    categoryId: process.env.YOUTUBE_CATEGORY_ID || '27',
    madeForKids: process.env.YOUTUBE_MADE_FOR_KIDS === 'true',
    tokenPath: path.join(rootDir, `.youtube-token-${channelKey}.json`),
    historyPath: path.join(rootDir, 'data', `youtube-upload-history-${channelKey}.json`),
    performancePath: path.join(rootDir, 'data', `youtube-performance-${channelKey}.json`),
    reportsDir: path.join(rootDir, 'reports', channelKey),
    likeRateMinViews: integer('YOUTUBE_LIKE_RATE_MIN_VIEWS', 100, 0, 1000000000),
  };

  if (requireOAuth) {
    const missing = [
      ['YOUTUBE_CLIENT_ID', config.clientId],
      ['YOUTUBE_CLIENT_SECRET', config.clientSecret],
      ['YOUTUBE_REDIRECT_URI', config.redirectUri],
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error(`YouTube OAuth 환경변수가 필요합니다: ${missing.join(', ')}`);
  }
  return config;
}
