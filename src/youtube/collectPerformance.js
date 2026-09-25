import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getYouTubeConfig, rootDir } from './config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from './auth.js';
import { loadContents } from './metadata.js';
import { loadUploadHistory } from './uploadHistory.js';
import { durationSeconds, inferTopic, parseCount, publicationAge } from './performanceMetrics.js';
import { loadPerformance, mergeSnapshot, savePerformance } from './performanceStore.js';
import { loadLongformContents } from '../content/contentCatalog.js';

const BATCH_SIZE = 50;

export async function collectPerformance({ now = DateTime.now(), channel: channelKey = 'wemakevoice' } = {}) {
  const config = getYouTubeConfig({ channel: channelKey });
  const auth = await getAuthorizedClient(config.channel);
  const channel = await verifyAuthorizedChannel(auth, config.channelId);
  const youtube = google.youtube({ version: 'v3', auth });
  const contents = [...await loadContents(), ...await loadLongformContents(rootDir)];
  const contentById = new Map(contents.map((content) => [content.id, content]));
  const history = (await loadUploadHistory(config.historyPath))
    .filter((item) => item.status !== 'private' && item.youtubeVideoId);
  const data = await loadPerformance(config.performancePath);
  const collectedAt = now.setZone(config.timezone).toISO();
  const successes = [];
  const failures = [];

  for (let offset = 0; offset < history.length; offset += BATCH_SIZE) {
    const batch = history.slice(offset, offset + BATCH_SIZE);
    let items;
    try {
      const response = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails', 'status'],
        id: batch.map((item) => item.youtubeVideoId),
      });
      items = response.data.items ?? [];
    } catch (error) {
      batch.forEach((item) => failures.push({ contentId: item.contentId, error: error.message }));
      continue;
    }
    const videoById = new Map(items.map((video) => [video.id, video]));
    for (const upload of batch) {
      try {
        const content = contentById.get(upload.contentId);
        if (!content) throw new Error('contents.json에서 contentId를 찾을 수 없음');
        const video = videoById.get(upload.youtubeVideoId);
        if (!video) throw new Error('YouTube video not found 또는 접근 불가');
        const publishedAt = upload.publishAt || video.snippet?.publishedAt;
        if (!publishedAt) throw new Error('공개 시각을 확인할 수 없음');
        const age = publicationAge(publishedAt, collectedAt);
        const snapshot = {
          collectedAt,
          views: parseCount(video.statistics?.viewCount) ?? 0,
          likes: parseCount(video.statistics?.likeCount),
          comments: parseCount(video.statistics?.commentCount),
          ...age,
        };
        const record = {
          contentId: content.id,
          youtubeVideoId: upload.youtubeVideoId,
          category: content.category || 'unknown',
          topic: inferTopic(content),
          title: content.title || video.snippet?.title || content.id,
          hook: content.hook || '',
          publishedAt,
          youtubePublishedAt: video.snippet?.publishedAt ?? null,
          duration: video.contentDetails?.duration ?? null,
          durationSeconds: durationSeconds(video.contentDetails?.duration),
          privacyStatus: video.status?.privacyStatus ?? null,
        };
        mergeSnapshot(data, record, snapshot);
        successes.push({ contentId: content.id, views: snapshot.views });
      } catch (error) {
        failures.push({ contentId: upload.contentId, error: error.message });
      }
    }
  }

  if (successes.length) await savePerformance(config.performancePath, data);
  return { channel, filePath: config.performancePath, successes, failures, total: history.length };
}
