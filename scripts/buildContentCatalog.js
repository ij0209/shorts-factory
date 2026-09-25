import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { loadContentCatalog } from '../src/content/contentCatalog.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(filePath, fallback) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function listFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(target) : [target];
    }));
    return nested.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function outputDirectory(entry) {
  if (entry.sourceKind === 'longform') return entry.channel === 'life-margin' ? 'life-margin-longform' : 'wemakevoice-longform';
  if (entry.content.contentType === 'life-margin-micro-text') return 'life-margin-micro-text';
  if (entry.channel === 'life-margin') return 'life-margin';
  if (entry.channel === 'dawn-verse') return 'dawn-verse';
  return 'wemakevoice';
}

function countBy(items, key) {
  return Object.fromEntries([...items.reduce((map, item) => {
    const value = item[key] ?? 'unknown';
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b)));
}

const catalog = await loadContentCatalog(rootDir);
const outputFiles = (await listFiles(path.join(rootDir, 'output'))).filter((file) => file.endsWith('.mp4'));
const histories = new Map();
for (const channel of ['wemakevoice', 'life-margin', 'dawn-verse']) {
  const items = await readJson(path.join(rootDir, 'data', `youtube-upload-history-${channel}.json`), []);
  for (const item of items) histories.set(`${channel}:${item.contentId}`, item);
}

const records = catalog.map((entry) => {
  const outputDir = outputDirectory(entry);
  const outputs = outputFiles.filter((file) => path.basename(file).startsWith(`${entry.id}_`));
  const upload = histories.get(`${entry.channel}:${entry.id}`) ?? null;
  const lifecycle = upload ? upload.status || 'uploaded' : outputs.length ? 'rendered' : entry.content.youtubeUpload === true ? 'approved' : 'content';
  return {
    id: entry.id,
    channel: entry.channel,
    contentType: entry.content.contentType || (entry.sourceKind === 'longform' ? 'longform' : 'announcement'),
    sourceKind: entry.sourceKind,
    sourceFile: entry.sourceFile,
    title: entry.content.title || entry.content.youtubeTitle || '',
    topic: entry.content.topic || '',
    experimentId: entry.content.experimentId || entry.content.generationRound || null,
    youtubeUpload: entry.content.youtubeUpload === true,
    lifecycle,
    outputDirectory: outputDir,
    outputs: outputs.map((file) => path.relative(rootDir, file)).sort(),
    youtube: upload ? {
      videoId: upload.youtubeVideoId,
      status: upload.status,
      publishAt: upload.publishAt,
      format: upload.format || null,
    } : null,
  };
});

const document = {
  version: 1,
  generatedAt: new Date().toISOString(),
  summary: {
    total: records.length,
    byChannel: countBy(records, 'channel'),
    byContentType: countBy(records, 'contentType'),
    byLifecycle: countBy(records, 'lifecycle'),
    bySourceKind: countBy(records, 'sourceKind'),
  },
  records,
};

const outputPath = path.join(rootDir, 'data', 'content-catalog.json');
const temporaryPath = `${outputPath}.tmp`;
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
await rename(temporaryPath, outputPath);
console.log(JSON.stringify({ outputPath, ...document.summary }, null, 2));
