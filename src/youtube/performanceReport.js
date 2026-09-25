import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';
import { derivedMetrics, milestoneSnapshots, publicationAge } from './performanceMetrics.js';
import { loadPerformance } from './performanceStore.js';

const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
const percent = (value) => value === null ? 'N/A' : `${(value * 100).toFixed(2)}%`;
const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function buildRows(data, now = DateTime.now()) {
  return data.videos.map((video) => {
    const snapshot = video.snapshots.at(-1);
    if (!snapshot) return null;
    const age = publicationAge(video.publishedAt, now.toISO());
    const current = { ...snapshot, ...age };
    return { ...video, latest: current, ...derivedMetrics(current), milestones: milestoneSnapshots(video.snapshots) };
  }).filter(Boolean);
}

export function aggregateBy(rows, key) {
  const groups = new Map();
  for (const row of rows.filter((item) => item.latest.isPublished)) {
    const name = row[key] || 'unknown';
    const group = groups.get(name) ?? { name, videos: 0, totalViews: 0, totalViewsPerDay: 0 };
    group.videos++;
    group.totalViews += row.latest.views ?? 0;
    group.totalViewsPerDay += row.viewsPerDay;
    groups.set(name, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    averageViews: group.totalViews / group.videos,
    averageViewsPerDay: group.totalViewsPerDay / group.videos,
  })).sort((a, b) => b.averageViews - a.averageViews);
}

function rankingTable(rows) {
  if (!rows.length) return '_공개된 영상 데이터가 아직 없습니다._\n';
  return [
    '| Rank | Content | Category | Views | Views/Day | Like Rate | Days Live |',
    '|---:|---|---|---:|---:|---:|---:|',
    ...rows.map((row, index) => `| ${index + 1} | ${row.title} | ${row.category} | ${number.format(row.latest.views)} | ${number.format(row.viewsPerDay)} | ${percent(row.likeRate)} | ${row.latest.daysSincePublished} |`),
  ].join('\n') + '\n';
}

function aggregateTable(groups) {
  if (!groups.length) return '_공개된 영상 데이터가 아직 없습니다._\n';
  return [
    '| Rank | Group | Videos | Total Views | Average Views | Average Views/Day |',
    '|---:|---|---:|---:|---:|---:|',
    ...groups.map((group, index) => `| ${index + 1} | ${group.name} | ${group.videos} | ${number.format(group.totalViews)} | ${number.format(group.averageViews)} | ${number.format(group.averageViewsPerDay)} |`),
  ].join('\n') + '\n';
}

export function markdownReport(rows, { generatedAt, likeRateMinViews }) {
  const live = rows.filter((row) => row.latest.isPublished);
  const scheduled = rows.filter((row) => !row.latest.isPublished);
  const topViews = [...live].sort((a, b) => b.latest.views - a.latest.views);
  const topVelocity = [...live].sort((a, b) => b.viewsPerDay - a.viewsPerDay);
  const topLikes = live.filter((row) => row.latest.views >= likeRateMinViews && row.likeRate !== null)
    .sort((a, b) => b.likeRate - a.likeRate);
  const low = [...live].sort((a, b) => a.viewsPerDay - b.viewsPerDay).slice(0, 5);
  const lines = [
    '# YouTube Shorts Performance Report', '',
    `Generated: ${generatedAt}`, '',
    `Live videos: ${live.length} · Scheduled videos: ${scheduled.length}`, '',
    '## Top Views', '', rankingTable(topViews),
    '## Top Views / Day', '', rankingTable(topVelocity),
    `## Top Like Rate (Views ≥ ${likeRateMinViews})`, '', rankingTable(topLikes),
    '## Category Performance', '', aggregateTable(aggregateBy(rows, 'category')),
    '## Topic Performance', '', aggregateTable(aggregateBy(rows, 'topic')),
    '## Low Performing', '', rankingTable(low),
    '## Video Details', '',
  ];
  for (const row of [...live, ...scheduled]) {
    const milestone = ['1d', '3d', '7d', '30d'].map((key) => {
      const value = row.milestones[key];
      return value ? `${key}: ${number.format(value.views)} views (observed ${value.observedAtDays}d)` : `${key}: pending`;
    }).join(' · ');
    lines.push(`### ${row.contentId}`, '', row.title, '', `Hook: ${row.hook || '-'}`, '',
      `Views: ${number.format(row.latest.views)} · Likes: ${row.latest.likes ?? 'N/A'} · Comments: ${row.latest.comments ?? 'N/A'} · Days Live: ${row.latest.daysSincePublished}`,
      '', `Views/Day: ${number.format(row.viewsPerDay)} · Like Rate: ${percent(row.likeRate)} · Comment Rate: ${percent(row.commentRate)}`,
      '', milestone, '');
  }
  if (scheduled.length) {
    const chronological = [...scheduled].sort((a, b) => DateTime.fromISO(a.publishedAt).toMillis() - DateTime.fromISO(b.publishedAt).toMillis());
    lines.push('## Scheduled', '', ...chronological.map((row) => `- ${row.publishedAt} — ${row.contentId} — ${row.title}`), '');
  }
  return lines.join('\n');
}

export function csvReport(rows) {
  const headers = ['contentId', 'youtubeVideoId', 'category', 'topic', 'title', 'hook', 'publishedAt', 'isPublished', 'daysSincePublished', 'durationSeconds', 'views', 'likes', 'comments', 'viewsPerDay', 'likeRate', 'commentRate', 'views1d', 'views3d', 'views7d', 'views30d', 'collectedAt'];
  const values = rows.map((row) => [
    row.contentId, row.youtubeVideoId, row.category, row.topic, row.title, row.hook,
    row.publishedAt, row.latest.isPublished, row.latest.daysSincePublished, row.durationSeconds,
    row.latest.views, row.latest.likes, row.latest.comments, row.viewsPerDay.toFixed(2),
    row.likeRate === null ? '' : row.likeRate.toFixed(6), row.commentRate === null ? '' : row.commentRate.toFixed(6),
    row.milestones['1d']?.views ?? '', row.milestones['3d']?.views ?? '', row.milestones['7d']?.views ?? '', row.milestones['30d']?.views ?? '', row.latest.collectedAt,
  ]);
  return [headers, ...values].map((row) => row.map(csv).join(',')).join('\n') + '\n';
}

export async function generatePerformanceReports({ config, now = DateTime.now() }) {
  const data = await loadPerformance(config.performancePath);
  if (!data.videos.length) throw new Error('성과 데이터가 없습니다. 먼저 npm run youtube:stats 를 실행하세요.');
  const localNow = now.setZone(config.timezone);
  const rows = buildRows(data, localNow);
  const date = localNow.toFormat('yyyy-LL-dd');
  const markdownPath = path.join(config.reportsDir, `youtube-performance-${date}.md`);
  const csvPath = path.join(config.reportsDir, 'youtube-performance.csv');
  await mkdir(config.reportsDir, { recursive: true });
  await writeFile(markdownPath, markdownReport(rows, { generatedAt: localNow.toISO(), likeRateMinViews: config.likeRateMinViews }), 'utf8');
  await writeFile(csvPath, csvReport(rows), 'utf8');
  return { rows, markdownPath, csvPath };
}
