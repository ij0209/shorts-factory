import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import './lifeMarginMicroText.css';

export function LifeMarginMicroTextTemplate({ title, items, brand='삶의여백', bgmFile, coverSafe=false }) {
  const frame=useCurrentFrame();
  const {durationInFrames}=useVideoConfig();
  const enter=coverSafe ? 1 : interpolate(frame,[0,10],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const breathe=interpolate(frame,[0,durationInFrames],[1,1.025],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const musicVolume=(f)=>Math.min(0.13,interpolate(f,[0,12,durationInFrames-12,durationInFrames],[0,0.13,0.13,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}));
  return <AbsoluteFill className="lmm-canvas">
    <div className="lmm-glow lmm-glow-one" style={{transform:`scale(${breathe})`}} />
    <div className="lmm-glow lmm-glow-two" />
    <div className="lmm-grain" />
    {bgmFile ? <Audio src={staticFile(bgmFile)} loop volume={musicVolume} /> : null}
    <div className="lmm-header" style={{opacity:enter,transform:`translateY(${(1-enter)*18}px)`}}>
      <div className="lmm-kicker">오늘의 삶 한 조각</div>
      <div className="lmm-title">{title}</div>
      <div className="lmm-rule" />
    </div>
    <div className="lmm-list" style={{opacity:enter}}>
      {items.map((item,index)=><div className="lmm-item" key={item}>
        <span className="lmm-number">{String(index+1).padStart(2,'0')}</span>
        <span className="lmm-copy">{item}</span>
      </div>)}
    </div>
    <div className="lmm-footer"><span>{brand}</span><span>천천히 읽어도 괜찮아요</span></div>
  </AbsoluteFill>;
}
