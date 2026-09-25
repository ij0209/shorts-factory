import path from 'node:path';
import { loadEnv } from '../utils/loadEnv.js';
import { getYouTubeConfig, rootDir } from './config.js';
import { collectPerformance } from './collectPerformance.js';
import { generatePerformanceReports } from './performanceReport.js';

await loadEnv(path.join(rootDir, '.env'));

function printCollection(result) {
  console.log(`\nYouTube 채널: ${result.channel.title}\n`);
  result.successes.forEach((item) => console.log(`✓ ${item.contentId}\n  Views: ${item.views}\n`));
  result.failures.forEach((item) => console.log(`✗ ${item.contentId}\n  Failed: ${item.error}\n`));
  console.log(`Stats Collection Complete\n\nSuccess: ${result.successes.length}\nFailed: ${result.failures.length}\nTotal: ${result.total}\nSaved: ${result.filePath}`);
}

async function report(channel) {
  const config = getYouTubeConfig({ channel });
  const result = await generatePerformanceReports({ config });
  const live = result.rows.filter((row) => row.latest.isPublished);
  console.log('\nYouTube Shorts Performance\n');
  if (!live.length) console.log('공개된 영상이 아직 없습니다. 예약 영상은 리포트 파일의 Scheduled 항목에서 확인할 수 있습니다.');
  live.sort((a, b) => b.viewsPerDay - a.viewsPerDay).forEach((row, index) => {
    console.log(`${index + 1}. ${row.contentId}\n${row.title}\nViews: ${row.latest.views}\nLikes: ${row.latest.likes ?? 'N/A'}\nComments: ${row.latest.comments ?? 'N/A'}\nDays Live: ${row.latest.daysSincePublished}\nViews / Day: ${row.viewsPerDay.toFixed(1)}\nLike Rate: ${row.likeRate === null ? 'N/A' : `${(row.likeRate * 100).toFixed(2)}%`}\n`);
  });
  console.log(`Markdown: ${result.markdownPath}\nCSV: ${result.csvPath}`);
}

async function main() {
  const command = process.argv[2];
  const options = { channel: 'wemakevoice' };
  for (let index = 3; index < process.argv.length; index++) {
    const arg = process.argv[index];
    if (arg.startsWith('--channel=')) options.channel = arg.slice(10);
    else if (arg === '--channel') options.channel = process.argv[++index];
    else throw new Error(`알 수 없는 옵션: ${arg}`);
  }
  if (!['stats', 'report', 'analytics'].includes(command)) {
    throw new Error('사용법: npm run youtube:stats | youtube:report | youtube:analytics');
  }
  if (command === 'stats' || command === 'analytics') printCollection(await collectPerformance({ channel: options.channel }));
  if (command === 'report' || command === 'analytics') await report(options.channel);
}

main().catch((error) => {
  console.error(`YouTube 성과 작업 실패: ${error.message}`);
  process.exitCode = 1;
});
