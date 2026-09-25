export const contentProfiles = {
  announcement: {
    id: 'announcement',
    compositionId: 'ShortsTemplate',
    brand: 'WeMakeVoice',
    brandSignatureEnabled: true,
    outputDirectory: 'wemakevoice',
  },
  creator_tts: {
    id: 'creator_tts',
    compositionId: 'ShortsTemplate',
    brand: 'WeMakeVoice',
    outputDirectory: 'wemakevoice',
    audioStart: 2,
    introDuration: 2,
    outroDuration: 2,
    outroText: '대본을 AI 음성으로\n만들어보세요',
    ttsPrompt: ({ narration }) => `Read only the following Korean narration in a clear, natural creator voice. Do not add or change words. Avoid a public-address announcement tone.\n\n${narration}`,
  },
  'life-margin': {
    id: 'life-margin',
    compositionId: 'LifeMarginTemplate',
    brand: '삶의 여백',
    outputDirectory: 'life-margin',
    audioStart: 0.35,
    outroDuration: 3,
    voiceName: 'Charon',
    alternatingVoices: { male: 'Charon', female: 'Aoede' },
    ttsPrompt: ({ narration, voiceName }) => {
      const voiceDescription = voiceName === 'Aoede'
        ? '따뜻하고 또렷한 성인 여성 목소리'
        : '편안하고 또렷한 성인 남성 목소리';
      return `아래 한국어 원고만 처음부터 끝까지 읽어주세요. 50~70대 시청자가 부담 없이 들을 수 있는 ${voiceDescription}를 사용하세요. 평소 대화와 비슷한 자연스러운 속도로 읽고, 쉼은 문장의 의미가 바뀌는 곳에만 짧게 두세요. 저음을 과도하게 깔거나 문장 끝을 길게 끌지 말고, 답답하거나 훈계하는 인상을 주지 마세요. 감정을 과장하지 말고 단어를 추가하거나 바꾸지 마세요.\n\n원고:\n${narration}`;
    },
    outroText: '오늘도 마음 편한\n하루 보내세요.',
    tagline: '삶의 지혜를 매일 전합니다.',
  },
  'life-margin-micro-text': {
    id: 'life-margin-micro-text',
    compositionId: 'LifeMarginMicroTextTemplate',
    brand: '삶의여백',
    outputDirectory: 'life-margin-micro-text',
  },
  dawn_verse: {
    id: 'dawn_verse',
    compositionId: 'DawnVerseTemplate',
    brand: '새벽한구절',
    outputDirectory: 'dawn-verse',
    voiceName: 'Aoede',
    ttsPrompt: ({ narration }) => `아래 한국어 원고만 정확히 읽어주세요. 새벽 라디오 진행자처럼 젊고 맑고 따뜻한 성인 여성 목소리로, 평소 대화에 가까운 또렷한 속도로 읽으세요. 속삭이지 말고 문장 사이를 오래 쉬지 마세요. 설교하듯 무겁게 말하거나 문장 끝을 늘이지 마세요. 글자를 추가하거나 바꾸지 마세요.\n\n${narration}`,
  },
};

export function getContentProfile(content) {
  const id = content.contentType || 'announcement';
  const profile = contentProfiles[id];
  if (!profile) throw new Error(`지원하지 않는 contentType: ${id}`);
  return profile;
}

export function resolveVoiceName(content, profile = getContentProfile(content)) {
  if (content.voiceName) return content.voiceName;
  if (profile.alternatingVoices) {
    const sequenceNumber = Number(content.voiceSequence ?? content.id?.match(/(\d+)(?!.*\d)/)?.[1]);
    if (Number.isFinite(sequenceNumber)) {
      return sequenceNumber % 2 === 0 ? profile.alternatingVoices.female : profile.alternatingVoices.male;
    }
    return profile.alternatingVoices.male;
  }
  return profile.voiceName || process.env.DEFAULT_VOICE || 'Kore';
}
