import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { datedOutputPath } from '../src/utils/outputFile.js';

test('MP4 생성일을 한국 시간 YYYYMMDD로 파일명에 붙인다', () => {
  const now = DateTime.fromISO('2026-09-07T16:10:00Z');
  assert.equal(datedOutputPath('/project', 'life-margin-test-001', 'life-margin', now), '/project/output/life-margin/life-margin-test-001_20260908.mp4');
});
