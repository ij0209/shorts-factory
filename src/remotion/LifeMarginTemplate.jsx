import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import './lifeMargin.css';

const Scene = ({ scene, index, coverSafe }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const transition = 0.75;
  const transitionOpacity = Math.min(
    interpolate(time, [Math.max(0, scene.start - transition), scene.start + transition], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(time, [scene.end - transition, scene.end + transition], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  const opacity = coverSafe && index === 0 && time < scene.start ? 1 : transitionOpacity;
  const progress = interpolate(time, [scene.start, scene.end], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const xDirection = index % 2 === 0 ? -1 : 1;
  return <AbsoluteFill style={{ opacity }}>
    <Img className="lm-scene" src={staticFile(scene.src)} style={{ transform: `scale(${1.04 + progress * 0.05}) translate3d(${xDirection * progress * 13}px, ${-progress * 8}px, 0)` }} />
  </AbsoluteFill>;
};

const Captions = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  if (time < 4) return null;
  const caption = captions.find(({ start, end }) => time >= start && time < end);
  if (!caption) return null;
  const local = time - caption.start;
  const opacity = interpolate(local, [0, 0.25, Math.max(0.3, caption.end - caption.start - 0.2), caption.end - caption.start], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return <div className="lm-caption-wrap" style={{ opacity }}><div className="lm-caption">{caption.text}</div></div>;
};

export const LifeMarginTemplate = ({ brand, categoryLabel, hook, coverSafe, scenes, captions, audioFile, bgmFile, audioStart, audioDuration, outroDuration, outroText, tagline }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const outroStart = Math.ceil((audioStart + audioDuration) * fps);
  const opening = coverSafe
    ? interpolate(frame, [0, fps * 3.2, fps * 4], [1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : interpolate(frame, [0, fps * 0.7, fps * 3.2, fps * 4], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bgmVolume = (currentFrame) => {
    const time = currentFrame / fps;
    const fadeIn = interpolate(time, [0, 1.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const fadeOut = interpolate(currentFrame, [durationInFrames - fps * 1.5, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    return 0.11 * fadeIn * fadeOut;
  };
  return <AbsoluteFill className="lm-canvas">
    <AbsoluteFill className="lm-fallback" />
    {scenes.map((scene, index) => <Scene key={index} scene={scene} index={index} coverSafe={coverSafe} />)}
    <AbsoluteFill className="lm-shade" />
    {frame < outroStart ? <><div className="lm-brand">{brand}</div><div className="lm-category">{categoryLabel}</div></> : null}
    {bgmFile ? <Audio src={staticFile(bgmFile)} loop volume={bgmVolume} /> : null}
    {audioFile ? <Sequence from={Math.floor(audioStart * fps)}><Audio src={staticFile(audioFile)} /></Sequence> : null}
    <div className="lm-hook" style={{ opacity: opening }}>{hook}</div>
    <Captions captions={captions} />
    <Sequence from={outroStart} durationInFrames={Math.ceil(outroDuration * fps)}>
      <AbsoluteFill className="lm-outro">
        <div className="lm-outro-copy">{outroText}</div>
        <div className="lm-outro-brand">{brand}</div>
        <div className="lm-tagline">{tagline}</div>
      </AbsoluteFill>
    </Sequence>
  </AbsoluteFill>;
};
