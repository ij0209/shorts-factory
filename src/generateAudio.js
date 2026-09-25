import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { run } from './utils/process.js';

async function generateGeminiAudio({ text, voiceName, outputPath, prompt: customPrompt }) {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = customPrompt ?? `Generate a professional Korean public-address announcement. Use a calm, clear, trustworthy adult voice, medium-slow pace, natural Korean pronunciation, and restrained emotion. Read only the transcript below without adding or changing any words.\n\nTranscript:\n${text}`;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const interaction = await client.interactions.create({
        model: process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview',
        input: prompt,
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice: voiceName || 'Kore' }] },
      });
      const audio = interaction.output_audio ?? interaction.outputAudio;
      if (!audio?.data) throw new Error('Gemini 응답에 오디오 데이터가 없습니다.');
      const pcmPath = path.format({ ...path.parse(outputPath), base: undefined, ext: '.pcm' });
      await writeFile(pcmPath, Buffer.from(audio.data, 'base64'));
      await run('ffmpeg', ['-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', pcmPath, '-codec:a', 'libmp3lame', '-q:a', '2', outputPath]);
      await access(outputPath);
      return outputPath;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw new Error(`Gemini TTS 생성 실패: ${lastError.message}`);
}

async function generateLocalAudio({ text, voiceName, outputPath }) {
  if (process.platform !== 'darwin') {
    throw new Error('로컬 테스트 TTS는 macOS say 명령을 사용합니다.');
  }
  const localVoice = { Kore: 'Yuna', Aoede: 'Flo (한국어(대한민국))', Charon: 'Eddy (한국어(대한민국))' }[voiceName] || voiceName;
  const aiffPath = path.format({ ...path.parse(outputPath), base: undefined, ext: '.aiff' });
  await run('say', ['-v', localVoice, '-o', aiffPath, text]);
  await run('ffmpeg', ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-q:a', '2', outputPath]);
  await access(outputPath);
  return outputPath;
}

export async function generateAudio({ text, voiceName = 'Kore', outputPath, prompt }) {
  if (process.env.GEMINI_API_KEY && process.env.USE_LOCAL_TTS !== 'true') {
    return generateGeminiAudio({ text, voiceName, outputPath, prompt });
  }

  if (process.env.WEMAKEVOICE_API_URL && process.env.WEMAKEVOICE_API_KEY && process.env.USE_LOCAL_TTS !== 'true') {
    throw new Error('WeMakeVoice API 어댑터는 API 명세 확인 후 연결해야 합니다. 현재는 USE_LOCAL_TTS=true를 사용하세요.');
  }
  return generateLocalAudio({ text, voiceName, outputPath });
}

export async function getAudioDuration(audioPath) {
  const value = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioPath]);
  const duration = Number(value);
  if (!Number.isFinite(duration)) throw new Error('음성 길이를 확인할 수 없습니다.');
  return duration;
}
