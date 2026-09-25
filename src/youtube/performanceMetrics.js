import { DateTime, Duration } from 'luxon';

export function parseCount(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function durationSeconds(isoDuration) {
  if (!isoDuration) return null;
  const duration = Duration.fromISO(isoDuration);
  return duration.isValid ? Math.round(duration.as('seconds')) : null;
}

export function publicationAge(publishedAt, collectedAt) {
  const published = DateTime.fromISO(publishedAt, { setZone: true });
  const collected = DateTime.fromISO(collectedAt, { setZone: true });
  if (!published.isValid || !collected.isValid || collected < published) {
    return { isPublished: false, daysSincePublished: 0, elapsedDays: 0 };
  }
  const elapsedDays = collected.diff(published, 'days').days;
  return { isPublished: true, daysSincePublished: Math.floor(elapsedDays), elapsedDays };
}

export function derivedMetrics(snapshot) {
  const views = snapshot.views ?? 0;
  const likes = snapshot.likes;
  const comments = snapshot.comments;
  const divisor = Math.max(1, snapshot.elapsedDays ?? snapshot.daysSincePublished ?? 0);
  return {
    viewsPerDay: snapshot.isPublished ? views / divisor : 0,
    likeRate: views > 0 && likes !== null ? likes / views : null,
    commentRate: views > 0 && comments !== null ? comments / views : null,
  };
}

export function milestoneSnapshots(snapshots, targets = [1, 3, 7, 30]) {
  const published = snapshots.filter((snapshot) => snapshot.isPublished);
  const maxElapsed = Math.max(-1, ...published.map((snapshot) => snapshot.elapsedDays ?? 0));
  return Object.fromEntries(targets.map((target) => {
    if (maxElapsed < target) return [`${target}d`, null];
    const closest = [...published].sort((a, b) =>
      Math.abs((a.elapsedDays ?? 0) - target) - Math.abs((b.elapsedDays ?? 0) - target))[0];
    return [`${target}d`, {
      views: closest.views,
      likes: closest.likes,
      comments: closest.comments,
      observedAtDays: Number((closest.elapsedDays ?? 0).toFixed(2)),
      collectedAt: closest.collectedAt,
    }];
  }));
}

export function inferTopic(content) {
  if (content.topic) return content.topic;
  const id = content.id || '';
  const topics = [
    ['fall-prevention', '낙상 예방'], ['fire-safety', '화재 예방'],
    ['recycling', '분리수거'], ['smoking', '흡연 민원'], ['parking', '주차'],
    ['checkout', '퇴실'], ['noise', '층간소음'], ['manner', '매너타임'],
    ['closing-10min', '마감 사전 안내'], ['closing', '영업 종료'],
  ];
  return topics.find(([token]) => id.includes(token))?.[1] ?? '기타';
}
