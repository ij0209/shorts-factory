import React from 'react';
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence,
  interpolate, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import './style.css';

const INTRO_SECONDS = 2;
const OUTRO_SECONDS = 2;

const Background = ({ backgroundVideo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const isImage = backgroundVideo && /\.(png|jpe?g|webp|svg)$/i.test(backgroundVideo);
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const motion = {
    transform: `scale(${1.02 + progress * 0.08}) translate3d(${progress * -18}px, ${progress * -11}px, 0)`,
  };
  return (
    <AbsoluteFill className="background-wrap">
      {isImage ? <Img src={staticFile(backgroundVideo)} className="background-media" style={motion} /> : null}
      {backgroundVideo && !isImage ? <OffthreadVideo src={staticFile(backgroundVideo)} muted loop className="background-media" /> : null}
      {!backgroundVideo ? <AbsoluteFill className="fallback-background" /> : null}
      <AbsoluteFill className="shade" />
    </AbsoluteFill>
  );
};

const Hook = ({ hook, hookLabel, hookAccent, variant }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const leave = interpolate(frame, [fps * 1.55, fps * 2], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const conversion = variant === 'conversion';
  return (
    <AbsoluteFill className={`hook-wrap${conversion ? ' hook-wrap-conversion' : ''}`} style={{ opacity: enter * leave }}>
      <div className={conversion ? 'hook-label' : 'eyebrow'}>{hookLabel || '사업장에서 바로 쓰는 안내방송'}</div>
      <div className={conversion ? 'hook-panel' : undefined} style={{ transform: `translateY(${(1 - enter) * 36}px) scale(${0.94 + enter * 0.06})` }}>
        {conversion && hookAccent ? <div className="hook-accent">{hookAccent}</div> : null}
        <div className={conversion ? 'hook hook-conversion' : 'hook'}>{hook}</div>
        {conversion ? <div className="hook-cta">그대로 사용할 수 있는 방송 문구</div> : null}
      </div>
    </AbsoluteFill>
  );
};

const Captions = ({ captions, contentTrack }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const caption = captions.find(({ start, end }) => time >= start && time < end);
  if (!caption) return null;
  const local = time - caption.start;
  const length = caption.end - caption.start;
  const opacity = interpolate(local, [0, 0.18, Math.max(0.2, length - 0.16), length], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const enter = interpolate(local, [0, 0.25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pulse = 0.62 + 0.38 * Math.sin(frame / 5);
  return (
    <div className="caption-wrap" style={{ opacity, transform: `translateY(${(1 - enter) * 18}px) scale(${0.985 + enter * 0.015})` }}>
      <div className="caption-label"><span className="live-dot" style={{ opacity: pulse }} />{contentTrack === 'creator_tts' ? 'AI 음성 나레이션' : '안내방송 예시'}</div>
      <div className="caption">{caption.text}</div>
    </div>
  );
};

const Outro = ({ text, brand, website }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, fps * 0.45], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill className="outro" style={{ opacity: progress }}>
      <div className="outro-copy" style={{ transform: `translateY(${(1 - progress) * 28}px)` }}>{text}</div>
      <div className="outro-brand">{brand}</div>
      <div className="website">{website}</div>
    </AbsoluteFill>
  );
};

const BrandSignature = ({ brand, website }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, fps * 0.25], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill className="brand-signature" style={{ opacity: progress }}>
      <div className="signature-brand" style={{ transform: `translateY(${(1 - progress) * 18}px)` }}>{brand}</div>
      <div className="signature-website">{website}</div>
    </AbsoluteFill>
  );
};

export const ShortsTemplate = ({ hook, hookLabel, hookAccent, visualVariant, captions, backgroundVideo, audioFile, mixedAudioFile, bgmFile, audioDuration, introDuration = 2, outroDuration = 2, hookType, contentTrack, brandSignatureEnabled, brandSignatureFile, brandSignatureDuration, brandSignatureGap, brandSignatureEndPause, brand, outroText, website }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const introFrames = Math.round(introDuration * fps);
  const outroStart = Math.ceil((introDuration + audioDuration) * fps);
  const signatureStart = Math.ceil((introDuration + audioDuration + brandSignatureGap) * fps);
  const signatureFrames = Math.ceil(brandSignatureDuration * fps);
  const signatureVisualFrames = signatureFrames + Math.ceil(brandSignatureEndPause * fps);
  const bgmVolume = (frame) => {
    const time = frame / fps;
    const totalDuration = durationInFrames / fps;
    const fadeIn = interpolate(time, [0, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const fadeOut = interpolate(time, [totalDuration - 1.2, totalDuration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const voiceEnd = introDuration + audioDuration;
    const duckIn = interpolate(time, [introDuration - 0.1, introDuration + 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const duckOut = interpolate(time, [voiceEnd - 0.1, voiceEnd + 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const narrationDuck = Math.min(duckIn, duckOut);
    const signatureStartTime = introDuration + audioDuration + brandSignatureGap;
    const signatureEndTime = signatureStartTime + brandSignatureDuration;
    const signatureDuckIn = interpolate(time, [signatureStartTime - 0.1, signatureStartTime + 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const signatureDuckOut = interpolate(time, [signatureEndTime - 0.12, signatureEndTime], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const signatureDuck = brandSignatureEnabled ? Math.min(signatureDuckIn, signatureDuckOut) : 0;
    const duckAmount = Math.max(narrationDuck, signatureDuck);
    const duckedVolume = signatureDuck > narrationDuck ? 0.2 : 0.22;
    const mixedVolume = 0.36 + (duckedVolume - 0.36) * duckAmount;
    return mixedVolume * fadeIn * fadeOut;
  };
  return (
    <AbsoluteFill className="canvas">
      <Background backgroundVideo={backgroundVideo} />
      <div className="brand-bug">{brand}</div>
      {bgmFile ? <Audio src={staticFile(bgmFile)} loop volume={bgmVolume} /> : null}
      {mixedAudioFile ? <Audio src={staticFile(mixedAudioFile)} /> : null}
      {audioFile ? <Sequence from={introFrames}><Audio src={staticFile(audioFile)} /></Sequence> : null}
      {brandSignatureEnabled && brandSignatureFile ? (
        <Sequence from={signatureStart} durationInFrames={signatureVisualFrames}>
          {!mixedAudioFile ? <Audio src={staticFile(brandSignatureFile)} /> : null}
          <BrandSignature brand={brand} website={website} />
        </Sequence>
      ) : null}
      {introFrames > 0 ? <Sequence durationInFrames={introFrames}><Hook hook={hook} hookLabel={hookLabel} hookAccent={hookAccent} variant={visualVariant} /></Sequence> : null}
      {introFrames === 0 && hook ? <div className="audio-first-context">{hook}</div> : null}
      <Captions captions={captions} contentTrack={contentTrack} />
      {!brandSignatureEnabled ? (
        <Sequence from={outroStart} durationInFrames={outroDuration * fps}>
          <Outro text={outroText} brand={brand} website={website} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
