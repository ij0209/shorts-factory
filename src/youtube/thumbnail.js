import { access, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { google } from 'googleapis';
import { run } from '../utils/process.js';

const MAX_BYTES = 2 * 1024 * 1024;

export function thumbnailPathForVideo(videoPath) {
  return path.join(path.dirname(videoPath), 'thumbnails', `${path.basename(videoPath, path.extname(videoPath))}.jpg`);
}

export async function generateThumbnail(videoPath, atSeconds = 1) {
  const outputPath = thumbnailPathForVideo(videoPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  for (const quality of [3, 5, 7]) {
    await run('ffmpeg', [
      '-y', '-ss', String(atSeconds), '-i', videoPath,
      '-frames:v', '1', '-vf', 'scale=1080:1920:flags=lanczos',
      '-q:v', String(quality), outputPath,
    ]);
    if ((await stat(outputPath)).size <= MAX_BYTES) return outputPath;
  }
  throw new Error(`썸네일이 YouTube 2MB 제한을 초과합니다: ${outputPath}`);
}

export async function findThumbnail(videoPath) {
  const thumbnailPath = thumbnailPathForVideo(videoPath);
  try { await access(thumbnailPath); return thumbnailPath; }
  catch { return null; }
}

export async function uploadThumbnail({ auth, videoId, thumbnailPath }) {
  const youtube = google.youtube({ version: 'v3', auth });
  await youtube.thumbnails.set({ videoId, media: { mimeType: 'image/jpeg', body: createReadStream(thumbnailPath) } });
}
