import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGrowth } from '../src/growth/evaluateGrowth.js';

const strategy = {
  northStar: 'test',
  decisionGates: { longformCandidate: { minimumViews: 1000, orMinimumViews: 300, orMinimumLikeRate: 0.015 } }
};

test('조회수 또는 공감률이 검증된 일반 숏츠만 롱폼 후보가 된다', () => {
  const snapshot = (views, likes) => [{ collectedAt:'2026-09-25T00:00:00Z', isPublished:true, views, likes }];
  const result = evaluateGrowth({ videos: [
    { contentId:'strong-001', title:'strong', publishedAt:'2026-09-01T00:00:00Z', snapshots:snapshot(1200, 5) },
    { contentId:'resonant-001', title:'resonant', publishedAt:'2026-09-01T00:00:00Z', snapshots:snapshot(400, 8) },
    { contentId:'weak-001', title:'weak', publishedAt:'2026-09-01T00:00:00Z', snapshots:snapshot(250, 1) },
    { contentId:'micro-001', title:'loop', publishedAt:'2026-09-01T00:00:00Z', snapshots:snapshot(5000, 1) }
  ] }, strategy, new Date('2026-09-25T00:00:00Z'));
  assert.deepEqual(result.longformCandidates.map(({ contentId }) => contentId), ['strong-001', 'resonant-001']);
  assert.equal(result.fuelStatus.paidDemand, 'not-tested');
});
