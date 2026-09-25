import { access } from 'node:fs/promises';
import path from 'node:path';
import { rootDir } from './config.js';
import { findOutputPath } from '../utils/outputFile.js';
import { getContentProfile } from '../contentTypes/profiles.js';
import { loadAllContents } from '../content/loadContents.js';
import { descriptionWithTracking } from './tracking.js';

export async function loadContents() {
  return loadAllContents(rootDir);
}

export function getYouTubeMetadata(content) {
  const description = content.youtube?.description ?? content.youtubeDescription;
  return {
    title: content.youtube?.title ?? content.youtubeTitle,
    description: descriptionWithTracking(content, description),
    tags: content.youtube?.tags ?? content.youtubeTags,
  };
}

export async function validateUploadCandidate(content) {
  const errors = [];
  const metadata = getYouTubeMetadata(content);
  const videoPath = await findOutputPath(rootDir, content.id, getContentProfile(content).outputDirectory);
  const thumbnailPath = null;
  if (!metadata.title?.trim()) errors.push('youtube title 없음');
  if (!metadata.description?.trim()) errors.push('youtube description 없음');
  if (!Array.isArray(metadata.tags) || !metadata.tags.length || metadata.tags.some((tag) => typeof tag !== 'string' || !tag.trim())) {
    errors.push('youtube tags 배열 오류');
  }
  try { await access(videoPath); } catch { errors.push(`MP4 없음: ${videoPath}`); }
  return { content, metadata, videoPath, thumbnailPath, errors };
}
