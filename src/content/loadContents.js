import { loadShortContents } from './contentCatalog.js';

export async function loadAllContents(rootDir) {
  return loadShortContents(rootDir);
}
