import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';

const colors = { purple: '#7657ff', blue: '#3d7cff', ink: '#101426', white: '#ffffff' };

function balancedKoreanTitle(text) {
  if (text.includes('\n')) return text;
  const words = text.trim().split(/\s+/);
  if (words.length < 3 || text.length < 15) return text;
  let bestIndex = 1;
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(' ').length;
    const second = words.slice(index).join(' ').length;
    const gap = Math.abs(first - second);
    if (gap < smallestGap) {
      bestIndex = index;
      smallestGap = gap;
    }
  }
  return `${words.slice(0, bestIndex).join(' ')}\n${words.slice(bestIndex).join(' ')}`;
}

function SceneTitle({ children, style }) {
  return <div style={{ whiteSpace: 'pre-line', wordBreak: 'keep-all', overflowWrap: 'normal', textWrap: 'balance', ...style }}>
    {balancedKoreanTitle(children)}
  </div>;
}

function Background({ src }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 240], [1.02, 1.09], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ overflow: 'hidden', background: colors.ink }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
    <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(8,12,26,.84) 0%, rgba(8,12,26,.54) 48%, rgba(8,12,26,.28) 100%)' }} />
  </AbsoluteFill>;
}

function Brand() {
  return <div style={{ position: 'absolute', top: 42, right: 54, color: 'white', fontSize: 25, fontWeight: 750, letterSpacing: -0.5 }}>WeMakeVoice</div>;
}

function Caption({ captions, time }) {
  const caption = captions?.find(({ start, end }) => time >= start && time < end);
  if (!caption) return null;
  return <div style={{ position: 'absolute', left: 220, right: 220, bottom: 64, display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
    <div style={{ whiteSpace: 'pre-line', color: 'white', background: 'rgba(7,10,20,.82)', borderRadius: 14, padding: '13px 24px 15px', fontSize: 38, lineHeight: 1.35, fontWeight: 760, boxShadow: '0 8px 28px rgba(0,0,0,.28)' }}>{caption.text}</div>
  </div>;
}

function BrollScene({ scene }) {
  return <AbsoluteFill>
    <Background src={scene.backgroundFile} />
    <div style={{ position: 'absolute', left: 110, top: 250, width: 920, color: 'white' }}>
      <div style={{ fontSize: 24, color: '#c9c1ff', fontWeight: 800, marginBottom: 22 }}>캠핑장 운영자를 위한 안내방송 자동화</div>
      <SceneTitle style={{ fontSize: scene.id === 'hook' ? 76 : 62, lineHeight: 1.16, letterSpacing: -3.5, fontWeight: 850 }}>{scene.title}</SceneTitle>
      {scene.id === 'hook' && <div style={{ marginTop: 32, width: 90, height: 7, borderRadius: 9, background: `linear-gradient(90deg, ${colors.purple}, ${colors.blue})` }} />}
    </div>
    <Brand />
  </AbsoluteFill>;
}

function AppScene({ scene }) {
  const frame = useCurrentFrame();
  const sceneFrames = Math.max(1, scene.durationFrames);
  const sourceFrames = Math.max(1, (scene.sourceEnd - scene.sourceStart) * 30);
  const playbackRate = sourceFrames / sceneFrames;
  const sourceTime = scene.sourceStart + (frame / 30) * playbackRate;
  const enter = interpolate(frame, [0, 16], [32, 0], { extrapolateRight: 'clamp' });
  const hideBusinessName = scene.id === 'demo-intro' && sourceTime < 7.45;
  const hideExistingReservations = scene.id === 'schedule-result' && sourceTime >= 78;
  const privacyMask = {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 13,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    background: 'rgba(238,241,250,.76)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.48)',
  };
  return <AbsoluteFill style={{ background: '#11162a', overflow: 'hidden' }}>
    <Img src={staticFile(scene.backgroundFile)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(.28)', transform: 'scale(1.08)' }} />
    <AbsoluteFill style={{ background: 'linear-gradient(100deg, rgba(11,15,31,.97) 0%, rgba(11,15,31,.80) 56%, rgba(11,15,31,.52) 100%)' }} />
    <div style={{ position: 'absolute', left: 105, top: 190, width: 720, transform: `translateY(${enter}px)` }}>
      <div style={{ color: '#bdb2ff', fontWeight: 800, fontSize: 24, marginBottom: 20 }}>실제 WeMakeVoice 앱 화면</div>
      <SceneTitle style={{ color: 'white', fontSize: 57, fontWeight: 850, lineHeight: 1.18, letterSpacing: -2.5 }}>{scene.title}</SceneTitle>
      <div style={{ marginTop: 30, color: 'rgba(255,255,255,.72)', fontSize: 28, lineHeight: 1.55 }}>화면을 따라 필요한 항목만<br />차례대로 설정하면 됩니다.</div>
    </div>
    <div style={{ position: 'absolute', right: 150, top: 52, width: 430, height: 934, borderRadius: 35, overflow: 'hidden', background: '#fff', boxShadow: '0 26px 70px rgba(0,0,0,.55)', border: '9px solid rgba(255,255,255,.94)' }}>
      <OffthreadVideo muted src={staticFile(scene.appFile)} startFrom={Math.round(scene.sourceStart * 30)} playbackRate={playbackRate} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {hideBusinessName && <div style={{ ...privacyMask, top: 96, height: 690 }} />}
      {hideExistingReservations && <>
        <div style={{ ...privacyMask, top: 121, height: 469 }} />
        <div style={{ ...privacyMask, top: 651, height: 169 }} />
      </>}
    </div>
    <Brand />
  </AbsoluteFill>;
}

function Scene({ scene, fps }) {
  const frame = useCurrentFrame();
  const time = frame / fps;
  return <AbsoluteFill>
    {scene.kind === 'app' ? <AppScene scene={scene} /> : <BrollScene scene={scene} />}
    <Audio src={staticFile(scene.audioFile)} volume={1} />
    <Caption captions={scene.captions} time={time} />
  </AbsoluteFill>;
}

export function WemakeVoiceLongformTemplate({ scenes, bgmFile, fps = 30 }) {
  return <AbsoluteFill style={{ fontFamily: 'Arial, Apple SD Gothic Neo, sans-serif', background: colors.ink }}>
    <Audio src={staticFile(bgmFile)} loop volume={0.075} />
    {scenes.map((scene) => <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationFrames} premountFor={fps}>
      <Scene scene={scene} fps={fps} />
    </Sequence>)}
  </AbsoluteFill>;
}
