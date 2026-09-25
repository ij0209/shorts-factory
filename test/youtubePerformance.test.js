import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { derivedMetrics, durationSeconds, milestoneSnapshots, publicationAge } from '../src/youtube/performanceMetrics.js';
import { aggregateBy } from '../src/youtube/performanceReport.js';

test('공개 전 영상은 경과일과 일평균을 0으로 계산한다', () => {
  const age = publicationAge('2026-09-01T19:00:00+09:00', '2026-08-31T12:00:00+09:00');
  assert.deepEqual(age, { isPublished: false, daysSincePublished: 0, elapsedDays: 0 });
  assert.equal(derivedMetrics({ views: 100, likes: 2, comments: 1, ...age }).viewsPerDay, 0);
});

test('첫 24시간은 0 나누기 없이 1일 기준으로 계산한다', () => {
  const age = publicationAge('2026-08-31T19:00:00+09:00', '2026-09-01T07:00:00+09:00');
  const metrics = derivedMetrics({ views: 120, likes: 6, comments: 3, ...age });
  assert.equal(age.daysSincePublished, 0);
  assert.equal(metrics.viewsPerDay, 120);
  assert.equal(metrics.likeRate, 0.05);
});

test('ISO duration을 초로 변환한다', () => assert.equal(durationSeconds('PT1M2.5S'), 63));

test('도달한 마일스톤만 가장 가까운 snapshot과 관측일을 표시한다', () => {
  const snapshots = [
    { isPublished: true, elapsedDays: 0.8, views: 100, likes: 2, comments: 0, collectedAt: 'a' },
    { isPublished: true, elapsedDays: 3.2, views: 500, likes: 8, comments: 1, collectedAt: 'b' },
  ];
  const result = milestoneSnapshots(snapshots);
  assert.equal(result['1d'].views, 100);
  assert.equal(result['3d'].observedAtDays, 3.2);
  assert.equal(result['7d'], null);
});

test('업종별 집계는 예약 영상을 제외하고 평균을 계산한다', () => {
  const rows = [
    { category: 'apartment', latest: { isPublished: true, views: 100 }, viewsPerDay: 50 },
    { category: 'apartment', latest: { isPublished: true, views: 300 }, viewsPerDay: 100 },
    { category: 'mart', latest: { isPublished: false, views: 0 }, viewsPerDay: 0 },
  ];
  const groups = aggregateBy(rows, 'category');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].averageViews, 200);
  assert.equal(groups[0].averageViewsPerDay, 75);
});
