import { DateTime } from 'luxon';
import { getYouTubeConfig, youtubeChannelForContent } from './config.js';
import { loadContents, validateUploadCandidate } from './metadata.js';
import { loadUploadHistory } from './uploadHistory.js';

function localPublishTime(date, config) {
  return date.set({ hour: config.publishHour, minute: config.publishMinute, second: 0, millisecond: 0 });
}

export function calculateFirstPublishAt({ config, history, startDate, allowGap = false, now = DateTime.now() }) {
  const localNow = now.setZone(config.timezone);
  let first;

  if (startDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error(`--start 날짜 형식은 YYYY-MM-DD여야 합니다: ${startDate}`);
    }
    const requested = DateTime.fromISO(startDate, { zone: config.timezone });
    if (!requested.isValid) throw new Error(`--start 날짜 형식은 YYYY-MM-DD여야 합니다: ${startDate}`);
    const requestedTime = localPublishTime(requested.startOf('day'), config);
    if (requestedTime <= localNow) {
      throw new Error(`요청한 예약 시각이 이미 지났습니다: ${requestedTime.toISO()}`);
    }
    first = requestedTime;
  } else {
    const today = localPublishTime(localNow.startOf('day'), config);
    first = config.channel === 'dawn-verse' && today > localNow
      ? today
      : localPublishTime(localNow.plus({ days: 1 }).startOf('day'), config);
  }

  const scheduled = history
    .map(({ publishAt }) => publishAt ? DateTime.fromISO(publishAt, { setZone: true }).setZone(config.timezone) : null)
    .filter((date) => date?.isValid)
    .sort((a, b) => b.toMillis() - a.toMillis())[0];
  if (scheduled && !allowGap) {
    const afterLast = localPublishTime(scheduled.plus({ days: 1 }).startOf('day'), config);
    if (afterLast > first) first = afterLast;
  }
  return first;
}

export async function buildUploadPlan({ id, experimentId, startDate, allowGap = false, privateTest = false, channel = 'wemakevoice' } = {}) {
  const config = getYouTubeConfig({ channel });
  const history = await loadUploadHistory(config.historyPath);
  const uploadedIds = new Set(history.map(({ contentId }) => contentId));
  const allContents = await loadContents();
  const requested = allContents.filter((content) => (!id || content.id === id) && (!experimentId || content.experimentId === experimentId));
  if (id && !requested.length) throw new Error(`콘텐츠를 찾을 수 없습니다: ${id}`);
  const contents = requested.filter((content) => youtubeChannelForContent(content) === config.channel);
  if (id && !contents.length) {
    throw new Error(`${id} 콘텐츠는 ${config.channel} 채널용이 아닙니다.`);
  }

  const invalid = [];
  const skipped = [];
  const valid = [];
  for (const content of contents) {
    if (content.youtubeUpload === false) {
      skipped.push({ contentId: content.id, reason: 'Upload disabled (채널별 업로드 미승인)' });
      continue;
    }
    if (uploadedIds.has(content.id)) {
      skipped.push({ contentId: content.id, reason: 'Already uploaded' });
      continue;
    }
    const candidate = await validateUploadCandidate(content);
    if (candidate.errors.length) invalid.push({ contentId: content.id, errors: candidate.errors });
    else valid.push(candidate);
  }

  if (privateTest && valid.length !== 1) {
    throw new Error('PRIVATE 테스트는 메타데이터가 정상인 --id 콘텐츠 하나만 지정해야 합니다.');
  }

  const firstPublishAt = calculateFirstPublishAt({ config, history, startDate, allowGap });
  const plan = valid.map((candidate, index) => {
    const local = privateTest ? null : firstPublishAt.plus({ days: index });
    return {
      ...candidate,
      privacyStatus: 'private',
      publishAtLocal: local?.toISO() ?? null,
      publishAtUtc: local?.toUTC().toISO() ?? null,
      status: privateTest ? 'private' : 'scheduled',
    };
  });
  return { config, plan, invalid, skipped };
}

export function printUploadPlan({ config, plan, invalid, skipped }, { privateTest = false } = {}) {
  console.log(`\nYouTube Upload Plan — ${config.channel}\n`);
  for (const item of skipped) console.log(`SKIP ${item.contentId}\n  ${item.reason}\n`);
  for (const item of invalid) console.log(`SKIP ${item.contentId}\n  ${item.errors.join(', ')}\n`);
  plan.forEach((item, index) => {
    const when = privateTest
      ? 'PRIVATE 테스트 — 예약 공개 없음'
      : DateTime.fromISO(item.publishAtLocal, { setZone: true }).toFormat(`yyyy-LL-dd HH:mm '${config.timezone}'`);
    console.log(`${index + 1}.\n${item.videoPath}\n${when}\n${item.metadata.title}\n`);
  });
  if (!plan.length) console.log('업로드할 영상이 없습니다.\n');
}
