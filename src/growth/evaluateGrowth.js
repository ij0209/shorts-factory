function latest(video) { return video.snapshots?.at(-1) ?? null; }

function formatOf(video) {
  if (video.contentId.includes('longform')) return 'longform';
  if (video.contentId.includes('micro')) return 'microShort';
  return 'standardShort';
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function evaluateGrowth(performance, strategy, now = new Date()) {
  const videos = performance.videos.map((video) => ({ ...video, latest: latest(video), format: formatOf(video) }))
    .filter((video) => video.latest && new Date(videoPublish(video)).getTime() <= now.getTime());
  const published = videos.filter(({ latest }) => latest.isPublished !== false);
  const formats = {};
  for (const format of ['standardShort', 'microShort', 'longform']) {
    const rows = published.filter((video) => video.format === format);
    const views = rows.map(({ latest }) => latest.views ?? 0);
    const likes = rows.reduce((sum, { latest }) => sum + (latest.likes ?? 0), 0);
    const totalViews = views.reduce((sum, value) => sum + value, 0);
    formats[format] = {
      videos: rows.length,
      totalViews,
      medianViews: median(views),
      likeRate: totalViews ? likes / totalViews : 0,
    };
  }
  const allViews = published.map(({ latest }) => latest.views ?? 0);
  const channelMedianViews = median(allViews);
  const candidates = published.filter((video) => {
    if (video.format !== 'standardShort') return false;
    const views = video.latest.views ?? 0;
    const likeRate = views ? (video.latest.likes ?? 0) / views : 0;
    const gate = strategy.decisionGates.longformCandidate;
    return views >= gate.minimumViews || (views >= gate.orMinimumViews && likeRate >= gate.orMinimumLikeRate);
  }).map(({ contentId, title, latest }) => ({
    contentId,
    title,
    views: latest.views ?? 0,
    likeRate: latest.views ? (latest.likes ?? 0) / latest.views : 0,
  })).sort((a, b) => b.views - a.views);
  return {
    generatedAt: now.toISOString(),
    northStar: strategy.northStar,
    publishedVideos: published.length,
    channelMedianViews,
    formats,
    longformCandidates: candidates,
    fuelStatus: {
      distribution: published.length >= 20 ? 'measuring' : 'insufficient-data',
      audienceTrust: formats.standardShort.likeRate >= 0.01 ? 'early-signal' : 'weak-signal',
      ownedAudience: 'not-measured',
      paidDemand: 'not-tested',
      repeatableRevenue: 'not-established'
    },
    nextGate: '유료 제품을 만들기 전에 명시적 요청 20건 또는 선주문 5건을 확인한다.'
  };
}

function videoPublish(video) {
  return video.publishedAt || video.youtubePublishedAt || '9999-12-31T00:00:00Z';
}
