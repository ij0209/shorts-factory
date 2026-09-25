import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
import {bundle} from '@remotion/bundler';
import {renderMedia,selectComposition} from '@remotion/renderer';

const rootDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const phaseArg=process.argv.find((arg)=>arg.startsWith('--phase='))?.slice(8);
const idArg=process.argv.find((arg)=>arg.startsWith('--id='))?.slice(5);
const batchSourceByPhase={
  round1:'life-margin-round1-20260917.json',
  round1_v2:'life-margin-round1-v2-20260923.json',
};
const sourcePath=batchSourceByPhase[phaseArg]
  ? path.join(rootDir,'contents/batches',batchSourceByPhase[phaseArg])
  : path.join(rootDir,'contents/experiments/life-margin-micro-text-001.json');
const content=JSON.parse(await readFile(sourcePath,'utf8'));
const outputDir=path.join(rootDir,'output/life-margin-micro-text');
await mkdir(outputDir,{recursive:true});
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const serveUrl=await bundle({entryPoint:path.join(rootDir,'src/remotion/index.jsx'),publicDir:path.join(rootDir,'public')});
const candidates=batchSourceByPhase[phaseArg]
  ? content.contents.filter((item)=>item.contentType==='life-margin-micro-text'&&(!idArg||item.id===idArg))
  : content.candidates.flatMap((candidate,index)=>content.durationVariants.map((durationSeconds)=>({candidate,durationSeconds,id:`life-margin-micro-${['children-boundaries','good-parent-words','family-distance'][index]}-${durationSeconds}s-001`})));
for(const entry of candidates){
    const candidate=entry.candidate||entry;
    const durationSeconds=entry.durationSeconds||entry.durationVariant;
    const id=entry.id;
    const inputProps={title:candidate.title.replace(' 5가지','\n5가지'),items:candidate.items,brand:'삶의여백',durationSeconds,bgmFile:'music/life-margin/quiet-reflection-001.mp3',coverSafe:phaseArg?.startsWith('round1')};
    const composition=await selectComposition({serveUrl,id:'LifeMarginMicroTextTemplate',inputProps});
    const outputLocation=path.join(outputDir,`${id}_${date}.mp4`);
    await renderMedia({serveUrl,composition,inputProps,codec:'h264',outputLocation});
    console.log(`완료: ${path.relative(rootDir,outputLocation)}`);
}
