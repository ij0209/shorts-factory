import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { loadEnv } from '../src/utils/loadEnv.js';
import { loadAllContents } from '../src/content/loadContents.js';
import { getYouTubeConfig, rootDir } from '../src/youtube/config.js';
import { loadUploadHistory } from '../src/youtube/uploadHistory.js';
import { calculateFirstPublishAt } from '../src/youtube/scheduleVideos.js';
import { findOutputPath } from '../src/utils/outputFile.js';
import { run } from '../src/utils/process.js';
import { DateTime } from 'luxon';

await loadEnv(path.join(rootDir, '.env'));
const experimentId = 'wmv-round2-dual-track';
const contents = (await loadAllContents(rootDir)).filter((content) => content.experimentId === experimentId);
if (contents.length !== 20 || contents.filter((content) => content.contentTrack === 'announcement').length !== 12 || contents.filter((content) => content.contentTrack === 'creator_tts').length !== 8) {
  throw new Error('Round 2는 announcement 12개, creator_tts 8개여야 합니다.');
}
const config = getYouTubeConfig({ channel: 'wemakevoice' });
const history = await loadUploadHistory(config.historyPath);
const uploadedById = new Map(history.map((entry) => [entry.contentId, entry]));
const first = calculateFirstPublishAt({ config, history });
const safe = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' / ');
const lines = [
  '# WeMakeVoice Round 2 생성 미리보기',
  '',
  `Experiment ID: \`${experimentId}\``,
  '',
  contents.every((content) => uploadedById.get(content.id)?.publishAt)
    ? '20개 영상은 YouTube에 예약되었습니다. 아래 날짜는 업로드 기록의 실제 예약일입니다. 영상 링크는 `round2-reservations.md`에 있습니다.'
    : contents.every((content) => content.youtubeUpload === true)
    ? '20개 영상은 예약 승인 상태입니다. 업로드되지 않은 항목의 날짜는 기존 예약 기록을 기준으로 한 계획입니다.'
    : '20개 후보는 검토용이며 업로드가 꺼져 있습니다. 날짜는 기존 예약 기록을 기준으로 한 예상안입니다.',
  '',
  '| # | Track | Topic | Target | Hook | Hook Type | Duration* | Core Message | CTA | Scheduled Date* |',
  '|---:|---|---|---|---|---|---|---|---|---|',
];
for (const [index, content] of contents.entries()) {
  const uploaded = uploadedById.get(content.id);
  const date = uploaded?.publishAt
    ? DateTime.fromISO(uploaded.publishAt, { setZone: true }).setZone(config.timezone).toFormat('yyyy-LL-dd HH:mm')
    : first.plus({ days: index }).toFormat('yyyy-LL-dd HH:mm');
  let duration = `약 ${Math.round([...content.narration].length / 5 + (content.hookType === 'broadcast_first' || content.contentTrack === 'creator_tts' ? 2 : 4))}초`;
  try {
    const video = await findOutputPath(rootDir, content.id, 'wemakevoice');
    const seconds = Number(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', video]));
    if (Number.isFinite(seconds)) duration = `${seconds.toFixed(1)}초`;
  } catch { /* 영상 생성 전에는 예상 길이를 사용한다. */ }
  lines.push(`| ${index + 1} | ${content.contentTrack} | ${safe(content.title)} | ${safe(content.target)} | ${safe(content.hook)} | ${content.hookType} | ${duration} | ${safe(content.coreMessage)} | ${safe(content.cta)} | ${date} KST |`);
}
lines.push('', '*Duration은 영상이 있으면 실제 길이, 없으면 글자 수 기반 추정입니다. 예약된 영상의 Scheduled Date는 업로드 기록의 실제 예약일입니다.', '', '## Announcement 12개', '');
for (const content of contents.filter((item) => item.contentTrack === 'announcement')) lines.push(`- **${content.title}** — ${safe(content.hook)} (${content.hookType}; ${content.problemCluster})`);
lines.push('', '## Creator TTS 8개', '');
for (const content of contents.filter((item) => item.contentTrack === 'creator_tts')) lines.push(`- **${content.title}** — ${safe(content.hook)}. 가설: ${content.hypothesis}`);
lines.push('', '## 배경 자산', '');
for (const content of contents) lines.push(`- ${content.title}: \`assets/backgrounds/${content.backgroundCategory || content.category}/${content.background}\``);
lines.push('', '예약 계획 확인: `npm run youtube:plan:wemakevoice -- --experiment-id=wmv-round2-dual-track`.');
const output = path.join(rootDir, 'reports', 'wemakevoice', 'round2-preview.md');
await writeFile(output, lines.join('\n') + '\n');
console.log(output);
