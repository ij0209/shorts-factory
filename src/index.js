import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateShort } from './generateShort.js';
import { loadEnv } from './utils/loadEnv.js';
import { loadAllContents } from './content/loadContents.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  await loadEnv(path.join(rootDir, '.env'));
  const allContents = await loadAllContents(rootDir);
  const args = process.argv.slice(2);
  const contentTypeArg = args.find((arg) => arg.startsWith('--content-type='));
  const requestedContentType = contentTypeArg?.slice('--content-type='.length);
  const experimentArg = args.find((arg) => arg.startsWith('--experiment-id='));
  const requestedExperimentId = experimentArg?.slice('--experiment-id='.length);
  const uploadReadyOnly = args.includes('--upload-ready');
  const requestedId = args.find((arg) => !arg.startsWith('--'));
  const contents = allContents.filter((content) =>
    content.contentType !== 'dawn_verse'
    &&
    (!requestedId || content.id === requestedId)
    && (!requestedExperimentId || content.experimentId === requestedExperimentId)
    && (!requestedContentType || (content.contentType || 'announcement') === requestedContentType)
    && (!uploadReadyOnly || content.youtubeUpload === true)
  );
  if (!contents.length) throw new Error(`콘텐츠를 찾을 수 없습니다: ${requestedId || requestedContentType}`);

  const results = { success: 0, failed: 0 };
  for (const content of contents) {
    try {
      console.log(`\n→ ${content.id} 생성 중`);
      const result = await generateShort(content, rootDir);
      console.log(`✓ ${content.id} 생성 완료${result.usedPlaceholderBackground ? ' (임시 배경 사용)' : ''}`);
      results.success++;
    } catch (error) {
      console.error(`✗ ${content.id} 생성 실패\n  Reason: ${error.message}`);
      results.failed++;
    }
  }
  console.log(`\nGeneration Complete\nSuccess: ${results.success}\nFailed: ${results.failed}\nTotal: ${contents.length}`);
  if (results.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Generation failed: ${error.message}`);
  process.exitCode = 1;
});
