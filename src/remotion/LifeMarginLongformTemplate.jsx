import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';

function Caption({ captions, time }) {
  const item = captions.find(({ start, end }) => time >= start && time < end);
  if (!item) return null;
  return <div style={{ position:'absolute', left:220, right:220, bottom:120, textAlign:'center' }}>
    <span style={{ display:'inline-block', whiteSpace:'pre-line', wordBreak:'keep-all', color:'#fff', background:'rgba(24,20,17,.76)', borderRadius:16, padding:'13px 26px 16px', fontSize:38, lineHeight:1.42, fontWeight:700, textShadow:'0 2px 8px #000' }}>{item.text}</span>
  </div>;
}

function Scene({ scene, fps, thumbnailMode=false }) {
  const frame = useCurrentFrame();
  const time = frame / fps;
  const scale = interpolate(frame, [0, scene.durationFrames], scene.panDirection === 'out' ? [1.1,1.02] : [1.02,1.1], { extrapolateRight:'clamp' });
  const opacity = thumbnailMode ? 1 : interpolate(frame, [0,18,scene.durationFrames-18,scene.durationFrames], [0,1,1,0], { extrapolateLeft:'clamp', extrapolateRight:'clamp' });
  return <AbsoluteFill style={{ background:'#171411', opacity, fontFamily:'Apple SD Gothic Neo, Arial, sans-serif' }}>
    <Img src={staticFile(scene.imageFile)} style={{ width:'100%', height:'100%', objectFit:'cover', transform:`scale(${scale})` }} />
    <AbsoluteFill style={{ background:'linear-gradient(90deg,rgba(18,15,12,.77),rgba(18,15,12,.22) 58%,rgba(18,15,12,.10))' }} />
    <div style={{ position:'absolute', left:92, top:72, color:'rgba(255,255,255,.82)', fontSize:25, fontWeight:700 }}>삶의 여백</div>
    <div style={{ position:'absolute', left:120, top:205, width:750, color:'#fff' }}>
      <div style={{ color:'#ead4ad', fontSize:27, fontWeight:800, marginBottom:18 }}>{scene.chapter}</div>
      <div style={{ whiteSpace:'pre-line', wordBreak:'keep-all', fontSize:64, lineHeight:1.2, fontWeight:800, letterSpacing:-3 }}>{scene.title}</div>
      <div style={{ width:78, height:4, borderRadius:4, background:'#d8b57a', marginTop:30 }} />
    </div>
    {scene.items?.length ? <div style={{ position:'absolute', right:105, top:165, width:760, padding:'34px 42px', borderRadius:24, background:'rgba(22,18,15,.72)', border:'1px solid rgba(255,255,255,.16)', color:'#fff' }}>
      {scene.items.map((item,index)=><div key={item} style={{ display:'flex', alignItems:'baseline', gap:20, padding:'11px 0', fontSize:30, lineHeight:1.32, fontWeight:650, wordBreak:'keep-all' }}>
        <span style={{ color:'#e8c58b', fontWeight:850, minWidth:34 }}>{index+1}</span><span>{item}</span>
      </div>)}
    </div> : null}
    {thumbnailMode ? null : <Audio src={staticFile(scene.audioFile)} />}
    {thumbnailMode ? null : <Caption captions={scene.captions} time={time} />}
  </AbsoluteFill>;
}

export function LifeMarginLongformTemplate({ scenes, bgmFile, fps=30, thumbnailMode=false }) {
  return <AbsoluteFill style={{ background:'#171411' }}>
    {thumbnailMode ? null : <Audio src={staticFile(bgmFile)} loop volume={0.065} />}
    {scenes.map((scene) => <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationFrames} premountFor={fps}>
      <Scene scene={scene} fps={fps} thumbnailMode={thumbnailMode} />
    </Sequence>)}
  </AbsoluteFill>;
}
