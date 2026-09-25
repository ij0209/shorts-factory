import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function loadUploadHistory(historyPath) {
  try {
    const history = JSON.parse(await readFile(historyPath, 'utf8'));
    if (!Array.isArray(history)) throw new Error('배열 형식이 아닙니다.');
    return history;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`YouTube 업로드 기록을 읽을 수 없습니다: ${error.message}`);
  }
}

export async function appendUploadHistory(historyPath, entry) {
  const history = await loadUploadHistory(historyPath);
  if (history.some(({ contentId }) => contentId === entry.contentId)) {
    throw new Error(`이미 업로드 기록이 있습니다: ${entry.contentId}`);
  }
  history.push(entry);
  await mkdir(path.dirname(historyPath), { recursive: true });
  const tempPath = `${historyPath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
  await rename(tempPath, historyPath);
}
