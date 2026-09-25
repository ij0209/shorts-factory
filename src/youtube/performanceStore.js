import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadPerformance(filePath) {
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.videos)) throw new Error('지원하지 않는 데이터 구조입니다.');
    return data;
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, updatedAt: null, videos: [] };
    throw new Error(`YouTube 성과 파일을 읽을 수 없습니다: ${error.message}`);
  }
}

export async function savePerformance(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
}

export function mergeSnapshot(data, record, snapshot) {
  const existing = data.videos.find((video) => video.contentId === record.contentId);
  if (existing) {
    Object.assign(existing, record);
    existing.snapshots ??= [];
    existing.snapshots.push(snapshot);
  } else {
    data.videos.push({ ...record, snapshots: [snapshot] });
  }
  data.videos.sort((a, b) => a.contentId.localeCompare(b.contentId));
  data.updatedAt = snapshot.collectedAt;
  return data;
}
