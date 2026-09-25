import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from '../utils/loadEnv.js';
import { generateContentDraft } from './generateContentDraft.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await loadEnv(path.join(rootDir, '.env'));

function parseArgs(args) {
  const aliases = {
    category: 'category', topic: 'topic', 'hook-type': 'hookType',
    'experiment-group': 'experimentGroup', context: 'additionalContext',
    'content-track': 'contentTrack', 'creator-type': 'creatorType',
    'use-case': 'useCase', 'pain-point': 'painPoint', 'experiment-id': 'experimentId',
  };
  const input = {};
  for (let index = 0; index < args.length; index++) {
    const raw = args[index];
    if (!raw.startsWith('--')) throw new Error(`알 수 없는 인자: ${raw}`);
    const [rawName, inlineValue] = raw.slice(2).split(/=(.*)/s);
    const key = aliases[rawName];
    if (!key) throw new Error(`알 수 없는 옵션: --${rawName}`);
    const value = inlineValue ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error(`--${rawName} 값이 필요합니다.`);
    input[key] = value;
  }
  return input;
}

generateContentDraft({ rootDir, input: parseArgs(process.argv.slice(2)) })
  .then(({ content, outputPath }) => {
    console.log(JSON.stringify(content, null, 2));
    console.error(`\nDraft saved: ${outputPath}`);
  })
  .catch((error) => {
    console.error(`콘텐츠 생성 실패: ${error.message}`);
    process.exitCode = 1;
  });
