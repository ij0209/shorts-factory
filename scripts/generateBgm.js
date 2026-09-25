import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sampleRate = 48000;
const seconds = 32;
const channels = 2;
const frames = sampleRate * seconds;
const pcm = Buffer.alloc(frames * channels * 2);
const progression = [
  [65.41, 98.00, 123.47, 146.83],
  [55.00, 82.41, 98.00, 130.81],
  [43.65, 65.41, 87.31, 110.00],
  [49.00, 73.42, 98.00, 123.47],
];

function smoothstep(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}

for (let frame = 0; frame < frames; frame++) {
  const t = frame / sampleRate;
  const chordLength = 8;
  const chordIndex = Math.floor(t / chordLength);
  const chordProgress = (t % chordLength) / chordLength;
  const blend = smoothstep(chordProgress);
  const currentChord = progression[chordIndex % progression.length];
  const nextChord = progression[(chordIndex + 1) % progression.length];
  const globalFade = Math.min(smoothstep(t / 2), smoothstep((seconds - t) / 2.5));
  const breath = 0.86 + 0.14 * Math.sin(2 * Math.PI * 0.055 * t);
  let left = 0;
  let right = 0;

  [currentChord, nextChord].forEach((chord, chordOffset) => {
    const chordGain = chordOffset === 0 ? Math.cos(blend * Math.PI / 2) : Math.sin(blend * Math.PI / 2);
    chord.forEach((frequency, index) => {
      const detune = 1 + (index - 1.5) * 0.0014;
      const phase = 2 * Math.PI * frequency * detune * t;
      const pad = Math.sin(phase) + 0.22 * Math.sin(phase * 2) + 0.08 * Math.sin(phase * 3);
      const amount = 0.19 * chordGain * globalFade * breath;
      left += pad * amount * (index % 2 ? 0.68 : 1);
      right += pad * amount * (index % 2 ? 1 : 0.68);
    });
  });

  const pulseLocal = t % 2;
  const pulseEnvelope = Math.exp(-pulseLocal * 3.2) * smoothstep(pulseLocal / 0.035) * globalFade;
  const pulse = Math.sin(2 * Math.PI * currentChord[0] * t) * 0.09 * pulseEnvelope;
  left += pulse;
  right += pulse;

  const leftValue = Math.max(-1, Math.min(1, left));
  const rightValue = Math.max(-1, Math.min(1, right));
  pcm.writeInt16LE(Math.round(leftValue * 32767), frame * 4);
  pcm.writeInt16LE(Math.round(rightValue * 32767), frame * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const outputPath = path.resolve('public', 'music', 'soft-ambient.wav');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.concat([header, pcm]));
console.log(outputPath);
