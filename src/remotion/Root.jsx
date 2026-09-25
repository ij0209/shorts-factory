import React from 'react';
import { Composition } from 'remotion';
import { ShortsTemplate } from './ShortsTemplate.jsx';
import { LifeMarginTemplate } from './LifeMarginTemplate.jsx';
import { WemakeVoiceLongformTemplate } from './WemakeVoiceLongformTemplate.jsx';
import { LifeMarginLongformTemplate } from './LifeMarginLongformTemplate.jsx';
import { LifeMarginMicroTextTemplate } from './LifeMarginMicroTextTemplate.jsx';
import { createCaptions } from '../generateSubtitle.js';

const lifeNarration = '나이가 들수록 모든 사람에게 나를 설명할 필요가 없습니다. 나를 오해하는 사람에게 계속 설명한다고 해서 그 사람이 반드시 나를 이해하는 것도 아닙니다. 때로는 설명할수록 내 마음만 더 지칠 뿐입니다. 좋은 인연은 긴 설명이 없어도 나를 믿어주고, 떠날 인연은 아무리 설명해도 결국 떠납니다. 그러니 나이가 들수록 모든 사람에게 이해받으려 애쓰기보다 내 마음이 편안한 쪽을 선택하세요. 말하지 않아도 괜찮습니다. 당신의 삶은 누군가를 설득하기 위해 사는 것이 아니니까요. 오늘도 마음 편한 하루 보내세요.';
const lifeAudioDuration = 55.728;
const lifeSceneData = [
  ['나이가 들수록 모든 사람에게 나를 설명할 필요가 없습니다.', 'sunset-lake-solitude-001.png'],
  ['나를 오해하는 사람에게 계속 설명한다고 해서 그 사람이 반드시 나를 이해하는 것도 아닙니다.', 'quiet-walking-path-001.png'],
  ['때로는 설명할수록 내 마음만 더 지칠 뿐입니다.', 'warm-tea-window-001.png'],
  ['좋은 인연은 긴 설명이 없어도 나를 믿어주고, 떠날 인연은 아무리 설명해도 결국 떠납니다.', 'calm-lake-ripples-001.png'],
  ['그러니 나이가 들수록 모든 사람에게 이해받으려 애쓰기보다 내 마음이 편안한 쪽을 선택하세요.', 'mountain-evening-light-001.png'],
  ['말하지 않아도 괜찮습니다. 당신의 삶은 누군가를 설득하기 위해 사는 것이 아니니까요.', 'open-window-curtain-001.png'],
  ['오늘도 마음 편한 하루 보내세요.', 'ocean-dawn-001.png'],
];
const lifeWeights = lifeSceneData.map(([text]) => Math.max([...text].length, 8));
const lifeWeightTotal = lifeWeights.reduce((sum, value) => sum + value, 0);
let lifeCursor = 0.35;
const lifePreviewScenes = lifeSceneData.map(([narration, file], index) => {
  const duration = index === lifeSceneData.length - 1 ? 0.35 + lifeAudioDuration - lifeCursor : lifeAudioDuration * lifeWeights[index] / lifeWeightTotal;
  const scene = { narration, src: `studio/life-margin/${file}`, start: lifeCursor, end: lifeCursor + duration };
  lifeCursor += duration;
  return scene;
});

const defaultProps = {
  hook: '마트 사장님,\n폐점 방송 이렇게 하세요 🔊',
  narration: '고객 여러분께 안내 말씀드립니다. 잠시 후 매장 영업이 종료될 예정입니다.',
  captions: [
    { text: '고객 여러분께 안내 말씀드립니다.', start: 2, end: 5 },
    { text: '잠시 후 매장 영업이 종료될 예정입니다.', start: 5, end: 9 },
  ],
  backgroundVideo: null,
  audioFile: null,
  bgmFile: 'music/shorts-ai-bgm.mp3',
  audioDuration: 7,
  introDuration: 2,
  outroDuration: 2,
  brandSignatureEnabled: false,
  brandSignatureFile: null,
  brandSignatureDuration: 0,
  brandSignatureGap: 1,
  brandSignatureEndPause: 1,
  brand: 'WeMakeVoice',
  outroText: '매일 반복되는 안내방송\n자동으로',
  website: 'wemakevoice.com',
};

export const RemotionRoot = () => (<>
  <Composition
    id="ShortsTemplate"
    component={ShortsTemplate}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={330}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.brandSignatureEnabled
        ? Math.ceil(((props.introDuration ?? 2) + props.audioDuration + props.brandSignatureGap + props.brandSignatureDuration + props.brandSignatureEndPause) * 30)
        : Math.ceil(((props.introDuration ?? 2) + props.audioDuration + (props.outroDuration ?? 2)) * 30),
      props,
    })}
  />
  <Composition
    id="LifeMarginTemplate"
    component={LifeMarginTemplate}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={1350}
    defaultProps={{
      brand: '삶의 여백', categoryLabel: '인간관계',
      hook: '나이가 들수록\n설명하지 않아도 됩니다', scenes: lifePreviewScenes,
      captions: createCaptions({ narration: lifeNarration, audioDuration: lifeAudioDuration, startAt: 0.35 }),
      audioFile: 'studio/life-margin/narration.mp3', bgmFile: 'music/life-margin/quiet-reflection-001.mp3', audioStart: 0.35, audioDuration: lifeAudioDuration,
      outroDuration: 3, outroText: '오늘도 마음 편한\n하루 보내세요.', tagline: '삶의 지혜를 매일 전합니다.',
    }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.ceil((props.audioStart + props.audioDuration + props.outroDuration) * 30),
      props,
    })}
  />
  <Composition
    id="LifeMarginMicroTextTemplate"
    component={LifeMarginMicroTextTemplate}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    defaultProps={{title:'자식과 가까울수록\n지켜야 할 5가지',items:['방문 전 먼저 묻기','답장이 늦어도 재촉하지 않기','조언 전에 들어주기','도움 뒤에 대가를 바라지 않기','자식 밖의 내 하루도 채우기'],brand:'삶의여백',bgmFile:'music/life-margin/quiet-reflection-001.mp3'}}
    calculateMetadata={({props})=>({durationInFrames:Math.round((props.durationSeconds||5)*30),props})}
  />
  <Composition
    id="WemakeVoiceLongformTemplate"
    component={WemakeVoiceLongformTemplate}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={5400}
    defaultProps={{ scenes: [], bgmFile: 'music/content/camping-checkout-001.mp3', fps: 30 }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, props.scenes.reduce((max, scene) => Math.max(max, scene.startFrame + scene.durationFrames), 0)),
      props,
    })}
  />
  <Composition
    id="LifeMarginLongformTemplate"
    component={LifeMarginLongformTemplate}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={18000}
    defaultProps={{ scenes: [], bgmFile: 'music/life-margin/inlaw-visit-first-001.mp3', fps: 30 }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, props.scenes.reduce((max, scene) => Math.max(max, scene.startFrame + scene.durationFrames), 0)),
      props,
    })}
  />
</>);
