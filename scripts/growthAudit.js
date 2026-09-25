import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { evaluateGrowth } from '../src/growth/evaluateGrowth.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strategy = JSON.parse(await readFile(path.join(rootDir, 'config/growth-operating-system.json'), 'utf8'));
const performance = JSON.parse(await readFile(path.join(rootDir, `data/youtube-performance-${strategy.focusChannel}.json`), 'utf8'));
console.log(JSON.stringify(evaluateGrowth(performance, strategy), null, 2));
