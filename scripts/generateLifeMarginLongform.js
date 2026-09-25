import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, copyFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { generateAudio, getAudioDuration } from '../src/generateAudio.js';
import { createCaptions } from '../src/generateSubtitle.js';
import { loadEnv } from '../src/utils/loadEnv.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fps = 30;
async function exists(file) { try { await access(file); return true; } catch { return false; } }

function narrationPrompt(voiceName, text) {
  const voiceDirection = voiceName === 'Aoede'
    ? '따뜻하고 또렷한 성인 여성 목소리'
    : '편안하고 또렷한 성인 남성 목소리';
  return `아래 한국어 원고만 읽어주세요. ${voiceDirection}로, 실제 옆자리에서 이야기를 건네듯 자연스럽게 읽으세요. 목소리를 지나치게 낮게 누르거나 답답하게 만들지 말고, 평소 대화 속도를 유지하세요. 쉼표와 문장 끝에서만 짧게 쉬고, 문장 끝을 길게 끌지 마세요. 훈계조나 과장된 감정은 피하고, 핵심 문장은 또렷하게 전달하세요. 단어를 추가하거나 바꾸지 마세요.\n\n${text}`;
}

async function loadContent() {
  const id = process.argv.find((arg) => arg.startsWith('--id='))?.slice(5) || 'life-margin-longform-children-boundaries-001';
  const directory = path.join(rootDir, 'contents/longform');
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    if (content.id === id) return content;
  }
  throw new Error(`삶의여백 롱폼 콘텐츠를 찾을 수 없습니다: ${id}`);
}

async function main() {
  await loadEnv(path.join(rootDir, '.env'));
  const content = await loadContent();
  const publicDir = path.join(rootDir, 'public/generated', content.id);
  const audioDir = path.join(rootDir, 'audio/longform', content.id);
  const outputDir = path.join(rootDir, 'output/life-margin-longform');
  await Promise.all([mkdir(publicDir,{recursive:true}),mkdir(audioDir,{recursive:true}),mkdir(outputDir,{recursive:true})]);

  const scenes=[];
  let cursor=0;
  for (const [index, scene] of content.scenes.entries()) {
    const sourceImage=path.join(rootDir,'assets/broll/life-margin-longform',content.visualAssetDirectory,scene.asset);
    await copyFile(sourceImage,path.join(publicDir,scene.asset));
    const audioPath=path.join(audioDir,`${scene.id}.mp3`);
    if (!await exists(audioPath)) await generateAudio({text:scene.narration,voiceName:content.voiceName,outputPath:audioPath,prompt:narrationPrompt(content.voiceName,scene.narration)});
    const audioDuration=await getAudioDuration(audioPath);
    const duration=audioDuration+1.1;
    const audioName=`${scene.id}.mp3`;
    await copyFile(audioPath,path.join(publicDir,audioName));
    scenes.push({...scene,startFrame:Math.round(cursor*fps),durationFrames:Math.ceil(duration*fps),imageFile:`generated/${content.id}/${scene.asset}`,audioFile:`generated/${content.id}/${audioName}`,captions:createCaptions({narration:scene.narration,audioDuration,startAt:0}),panDirection:index%2?'out':'in'});
    cursor+=duration;
  }
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
  const outputPath=path.join(outputDir,`${content.id}_${date}.mp4`);
  const serveUrl=await bundle({entryPoint:path.join(rootDir,'src/remotion/index.jsx'),publicDir:path.join(rootDir,'public')});
  const inputProps={scenes,bgmFile:content.bgm,fps};
  const composition=await selectComposition({serveUrl,id:'LifeMarginLongformTemplate',inputProps});
  await renderMedia({serveUrl,composition,codec:'h264',outputLocation:outputPath,inputProps});
  console.log(JSON.stringify({outputPath,duration:cursor,sceneCount:scenes.length},null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
