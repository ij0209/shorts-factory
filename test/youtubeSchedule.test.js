import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { calculateFirstPublishAt } from '../src/youtube/scheduleVideos.js';

const config = { timezone: 'Asia/Seoul', publishHour: 19, publishMinute: 0 };

test('기록이 없으면 다음 날 19:00 KST부터 시작한다', () => {
  const now = DateTime.fromISO('2026-08-31T10:00:00+09:00');
  const result = calculateFirstPublishAt({ config, history: [], now });
  assert.equal(result.toISO(), '2026-09-01T19:00:00.000+09:00');
});

test('마지막 예약 다음 날부터 시작한다', () => {
  const now = DateTime.fromISO('2026-08-31T10:00:00+09:00');
  const history = [{ publishAt: '2026-09-07T19:00:00.000+09:00' }];
  const result = calculateFirstPublishAt({ config, history, now });
  assert.equal(result.toISO(), '2026-09-08T19:00:00.000+09:00');
});

test('요청 시작일이 더 늦으면 요청일을 사용한다', () => {
  const now = DateTime.fromISO('2026-08-31T10:00:00+09:00');
  const result = calculateFirstPublishAt({ config, history: [], startDate: '2026-09-10', now });
  assert.equal(result.toISO(), '2026-09-10T19:00:00.000+09:00');
});

test('오늘 예약 시간이 아직 미래면 명시한 오늘부터 시작한다', () => {
  const now = DateTime.fromISO('2026-08-31T12:14:00+09:00');
  const result = calculateFirstPublishAt({ config, history: [], startDate: '2026-08-31', now });
  assert.equal(result.toISO(), '2026-08-31T19:00:00.000+09:00');
});

test('오늘 예약 시간이 이미 지났으면 거부한다', () => {
  const now = DateTime.fromISO('2026-08-31T20:00:00+09:00');
  assert.throws(
    () => calculateFirstPublishAt({ config, history: [], startDate: '2026-08-31', now }),
    /이미 지났습니다/,
  );
});

test('새벽한구절은 가장 가까운 미래의 05:00 KST부터 시작한다', () => {
  const dawn = { channel: 'dawn-verse', timezone: 'Asia/Seoul', publishHour: 5, publishMinute: 0 };
  const before = calculateFirstPublishAt({ config: dawn, history: [], now: DateTime.fromISO('2026-09-24T04:59:00+09:00') });
  const after = calculateFirstPublishAt({ config: dawn, history: [], now: DateTime.fromISO('2026-09-24T05:01:00+09:00') });
  assert.equal(before.toISO(), '2026-09-24T05:00:00.000+09:00');
  assert.equal(after.toISO(), '2026-09-25T05:00:00.000+09:00');
});
