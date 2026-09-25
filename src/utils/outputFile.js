import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';

export function datedOutputPath(rootDir, contentId, outputDirectory, now = DateTime.now()) {
  const date = now.setZone('Asia/Seoul').toFormat('yyyyLLdd');
  return path.join(rootDir, 'output', outputDirectory, `${contentId}_${date}.mp4`);
}

export async function findOutputPath(rootDir, contentId, outputDirectory = 'wemakevoice') {
  const outputDir = path.join(rootDir, 'output', outputDirectory);
  const legacyPath = path.join(outputDir, `${contentId}.mp4`);
  let files;
  try { files = await readdir(outputDir); }
  catch (error) {
    if (error.code === 'ENOENT') return path.join(rootDir, 'output', `${contentId}.mp4`);
    throw error;
  }
  const pattern = new RegExp(`^${contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d{8})\\.mp4$`);
  const candidates = files.filter((file) => pattern.test(file));
  if (!candidates.length) {
    const rootLegacy = path.join(rootDir, 'output', `${contentId}.mp4`);
    try { await stat(legacyPath); return legacyPath; } catch {}
    return rootLegacy;
  }
  const withStats = await Promise.all(candidates.map(async (file) => ({ file, modified: (await stat(path.join(outputDir, file))).mtimeMs })));
  withStats.sort((a, b) => b.modified - a.modified || b.file.localeCompare(a.file));
  return path.join(outputDir, withStats[0].file);
}
