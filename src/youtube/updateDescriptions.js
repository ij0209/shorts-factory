import { google } from 'googleapis';
import { getYouTubeConfig } from './config.js';
import { getAuthorizedClient, verifyAuthorizedChannel } from './auth.js';
import { loadContents, getYouTubeMetadata } from './metadata.js';
import { loadUploadHistory } from './uploadHistory.js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { rootDir } from './config.js';

async function loadLongformContents() {
  const directory = path.join(rootDir, 'contents', 'longform');
  try {
    const files = (await readdir(directory)).filter((file) => file.endsWith('.json'));
    return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(directory, file), 'utf8'))));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function updateTrackedDescriptions(channel = 'wemakevoice') {
  const config = getYouTubeConfig({ channel });
  const auth = await getAuthorizedClient(config.channel);
  const verified = await verifyAuthorizedChannel(auth, config.channelId);
  const youtube = google.youtube({ version: 'v3', auth });
  const contents = [...await loadContents(), ...await loadLongformContents()];
  const byId = new Map(contents.map((content) => [content.id, content]));
  const history = await loadUploadHistory(config.historyPath);
  const updated = [];
  const skipped = [];

  for (const upload of history) {
    const content = byId.get(upload.contentId);
    if (!content || !upload.youtubeVideoId) { skipped.push(upload.contentId); continue; }
    const response = await youtube.videos.list({ part: ['snippet'], id: [upload.youtubeVideoId] });
    const video = response.data.items?.[0];
    if (!video?.snippet) { skipped.push(upload.contentId); continue; }
    const desired = getYouTubeMetadata(content).description;
    if (video.snippet.description === desired) { skipped.push(upload.contentId); continue; }
    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: video.id,
        snippet: { ...video.snippet, description: desired },
      },
    });
    updated.push(upload.contentId);
  }
  return { channel: verified.title, updated, skipped };
}
