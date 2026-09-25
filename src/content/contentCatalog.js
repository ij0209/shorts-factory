import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function directoryExists(directory) {
  try { await readdir(directory); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function jsonFiles(directory) {
  if (!await directoryExists(directory)) return [];
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function projectRoundFiles(rootDir) {
  const projectsDir = path.join(rootDir, 'projects');
  if (!await directoryExists(projectsDir)) return [];
  const projects = (await readdir(projectsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const files = [];
  for (const project of projects) {
    const roundsDir = path.join(projectsDir, project, 'rounds');
    if (!await directoryExists(roundsDir)) continue;
    const rounds = (await readdir(roundsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const round of rounds) {
      const contentPath = path.join(roundsDir, round, 'contents.json');
      try { await readFile(contentPath, 'utf8'); files.push(contentPath); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  return files;
}

function inferChannel(content) {
  if (content.youtubeChannel) return content.youtubeChannel;
  if (content.project === 'life-margin' || content.contentType?.startsWith('life-margin')) return 'life-margin';
  if (content.project === 'dawn_verse' || content.contentType === 'dawn_verse') return 'dawn-verse';
  return 'wemakevoice';
}

function inferSourceKind(rootDir, sourcePath) {
  const relative = path.relative(rootDir, sourcePath);
  if (relative.startsWith(`contents${path.sep}longform${path.sep}`)) return 'longform';
  if (relative.startsWith(`contents${path.sep}batches${path.sep}`)) return 'batch';
  if (relative.startsWith(`projects${path.sep}`)) return 'project-round';
  return 'base';
}

async function readSource(rootDir, sourcePath) {
  const value = JSON.parse(await readFile(sourcePath, 'utf8'));
  const contents = Array.isArray(value.contents) ? value.contents : value.id ? [value] : [];
  if (!contents.length) throw new Error(`${sourcePath}에서 콘텐츠를 찾을 수 없습니다.`);
  const sourceKind = inferSourceKind(rootDir, sourcePath);
  return contents.map((content) => ({
    content,
    id: content.id,
    channel: inferChannel(content),
    sourceKind,
    sourceFile: path.relative(rootDir, sourcePath),
  }));
}

export async function discoverContentSources(rootDir) {
  const sources = [path.join(rootDir, 'contents', 'contents.json')];
  sources.push(...await jsonFiles(path.join(rootDir, 'contents', 'batches')));
  sources.push(...await jsonFiles(path.join(rootDir, 'contents', 'longform')));
  sources.push(...await projectRoundFiles(rootDir));
  return sources;
}

export async function loadContentCatalog(rootDir) {
  const sources = await discoverContentSources(rootDir);
  const entries = (await Promise.all(sources.map((source) => readSource(rootDir, source)))).flat();
  const byId = new Map();
  for (const entry of entries) {
    if (!entry.id) throw new Error(`${entry.sourceFile}: 콘텐츠 ID가 없습니다.`);
    const previous = byId.get(entry.id);
    if (previous) throw new Error(`중복 콘텐츠 ID: ${entry.id} (${previous.sourceFile}, ${entry.sourceFile})`);
    byId.set(entry.id, entry);
  }
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadShortContents(rootDir) {
  return (await loadContentCatalog(rootDir))
    .filter(({ sourceKind }) => sourceKind !== 'longform')
    .map(({ content }) => content);
}

export async function loadLongformContents(rootDir) {
  return (await loadContentCatalog(rootDir))
    .filter(({ sourceKind }) => sourceKind === 'longform')
    .map(({ content }) => content);
}
