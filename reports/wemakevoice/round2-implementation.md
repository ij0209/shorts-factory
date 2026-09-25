# WeMakeVoice Round 2 구현 보고

## 1. 변경 파일

- 생성·렌더: `src/index.js`, `src/generateShort.js`, `src/generateAudio.js`, `src/renderVideo.js`, `src/remotion/ShortsTemplate.jsx`, `src/remotion/Root.jsx`, `src/remotion/style.css`, `src/contentTypes/profiles.js`
- 콘텐츠·검증: `src/content/contentSchema.js`, `src/content/generateContentDraft.js`, `src/content/cli.js`, `src/content/creatorTtsPrompt.js`, `src/content/shortsFactoryV2Prompt.js`, `contents/batches/wmv-round2-dual-track.json`
- 업로드·미리보기: `src/youtube/scheduleVideos.js`, `src/youtube/cli.js`, `src/youtube/tracking.js`, `scripts/previewWmvRound2.js`, `scripts/rerenderWmvRound2Backgrounds.js`, `reports/wemakevoice/round2-preview.md`
- 배경·규칙: `assets/backgrounds/creator/*.svg` 8개, `assets/backgrounds/public_facility/closing-room.svg`, `AGENTS.md`, `README.md`, `test/wmvRound2.test.js`

## 2. Content Track

`contentTrack`은 선택 필드이며 `announcement` 또는 `creator_tts`를 사용합니다. 기존 콘텐츠는 필드 없이 그대로 로드됩니다. Round 2 20개에는 `experimentId: wmv-round2-dual-track`을 공통으로 저장했습니다.

## 3. Announcement

기존 WeMakeVoice 음성·렌더·브랜드 서명 경로를 재사용합니다. `broadcast_first`에서는 도입 대기 없이 안내방송 음성이 0초부터 시작합니다. 기존 업종별 사진을 배경에 연결했고, 새 후보는 기존 폐점·점검·흡연 등과 다른 구체적 운영 순간으로 작성했습니다.

## 4. Creator TTS

별도 프로필·콘텐츠 프롬프트·메타데이터·CTA를 사용합니다. 문제형 영상은 2초 도입 후 음성을 시작하고 `result_first`는 0초부터 시작합니다. 목소리 비교 영상은 같은 문장을 Kore와 Aoede로 각각 합성합니다. 새 배경은 실제 제품 UI를 흉내 내지 않는 주제별 추상 일러스트 8개입니다. 게시용 음성은 기존 설정의 Gemini TTS Aoede로 만들었습니다. 실제 WeMakeVoice API 연동은 아직 없습니다.

## 5. Metadata

- 공통: `contentTrack`, `experimentId`, `experimentGroup`, `hookType`, `category`, `topic`, `backgroundCategory`, `background`, `youtubeUpload`
- Announcement: `industry`, `problemCluster`
- Creator TTS: `creatorType`, `useCase`, `painPoint`, `hypothesis`
- 검토 단계에서는 `youtubeUpload: false`로 보관했고, 사용자 예약 요청 후 `true`로 전환했습니다. 업로드는 `--experiment-id=wmv-round2-dual-track`으로 제한했습니다.

## 6. Announcement 후보 12개

- 마트 계산대 마감 안내방송 — Hook: 계산대 마감 안내; closing; broadcast_first
- 마트 주차장 출구 정체 안내방송 — Hook: 출구에 차가 몰릴 때; parking; situation
- 아파트 야간 소음 자제 안내방송 — Hook: 밤마다 이 방송을 / 직접 하시나요?; noise; manager_problem
- 아파트 소방차 진입로 주차 금지 안내방송 — Hook: 소방차 진입로 확보; safety; broadcast_first
- 캠핑장 퇴실 지연 시 안내방송 — Hook: 퇴실 시간이 지났는데 / 아직 자리가 남았을 때; checkout; situation
- 캠핑장 야간 대화 소음 안내방송 — Hook: 밤 대화 소음 안내; noise; broadcast_first
- 키즈카페 보호자 호출 안내방송 — Hook: 보호자 호출 방송; safety; default
- 병원 접수 마감 안내방송 — Hook: 오늘 진료 접수가 / 곧 끝날 때; closing; situation
- 헬스장 락커 정리 안내방송 — Hook: 락커 정리 요청을 / 매번 직접 하시나요?; facility_use; manager_problem
- 주차장 출차 전 정산 안내방송 — Hook: 출차 전 정산 안내; exit; broadcast_first
- 공공시설 대관실 이용 종료 안내방송 — Hook: 대관 종료 10분 전; closing; situation
- 아파트 공용공간 반려견 목줄 안내방송 — Hook: 목줄 민원, / 어떻게 방송할까요?; pet; manager_problem

## 7. Creator TTS 후보 8개

- 쇼츠 녹음 없이 나레이션 넣는 방법 — Hook: 녹음 없이 / 쇼츠에 목소리 넣기; 가설: 직접 녹음 부담이 핵심 유입 문제인지
- 내 목소리 공개 없이 영상 만드는 방법 — Hook: 내 목소리 없이도 / 영상이 될까요?; 가설: 목소리 공개 부담이 제작 장벽인지
- 나레이션 재녹음 줄이는 방법 — Hook: 한 문장 때문에 / 다시 녹음할 때; 가설: 수정과 재녹음 부담이 반응을 얻는지
- 글로 쓴 대본이 영상 나레이션이 되는 과정 — Hook: 글 한 문장이 / 나레이션으로; 가설: 텍스트에서 음성으로 바뀌는 결과가 시선을 잡는지
- 같은 대본 다른 목소리, 영상에 맞는 선택은? — Hook: 같은 대본, / 다른 목소리; 가설: 목소리 비교 질문이 참여를 만드는지
- 쇼츠 나레이션, 대본부터 음성까지 — Hook: 이 목소리로 / 쇼츠를 시작하면?; 가설: 결과 음성을 먼저 들려주면 유지율이 높아지는지
- 매장 소개 영상에 목소리 넣는 방법 — Hook: 매장 영상은 찍었는데 / 설명할 목소리가 없다면; 가설: 소상공인 영상 제작 수요가 있는지
- 지금 듣는 목소리도 AI입니다 — Hook: 지금 듣는 목소리, / AI로 만들었습니다; 가설: 영상 자체의 AI 음성이 결과 시연으로 통하는지

## 8. 예약 계획

미리보기: `reports/wemakevoice/round2-preview.md`. 2026-09-24에 20편을 모두 YouTube에 예약했습니다. 실제 예약은 2026-09-25~2026-10-14 매일 19:00 KST이며, 영상 ID와 시각은 `reports/wemakevoice/round2-reservations.md`에 있습니다.

## 9. Regression

- 자동 테스트 27개 통과; 기존 콘텐츠 85개 로드 및 기존 채널 설정 확인
- Announcement와 Creator TTS 각 샘플 및 전체 20개 1080×1920 렌더 성공, 썸네일 20개 확인
- 기존 삶의 여백 Shorts 1편 로컬 TTS 회귀 렌더 성공
- WeMakeVoice Round 2 20개만 분리해 예약, YouTube API에서 20개 모두 비공개·예약 공개 시각·제목·설명 일치 확인; 삶의 여백 채널 계획에 Round 2 포함 없음
- 20개 모두 실제 배경 자산이 존재하며 서로 다른 배경 파일을 사용함. 기존 콘텐츠 및 롱폼과 정확히 같은 제목·원고 없음.

## 10. 수동 작업

문구·목소리·배경 검토와 `youtubeUpload` 승인 처리는 완료했습니다. WeMakeVoice 실제 TTS API 어댑터는 아직 없어 Gemini TTS를 사용합니다. 실제 제품 UI로 검증된 TTS 화면은 사용하지 않았습니다. Analytics 입력과 트랙 간 비교는 수동입니다.

## 11. Round 2 종료 후 필요한 데이터

콘텐츠 ID 또는 YouTube 영상 ID별 `views`, `engagedViews`, `stayedToWatch`, `averageViewDuration`, `averagePercentageViewed`, `likes`, `comments`, `shares`, `subscribers` 및 게시일을 가져오면 됩니다. 트랙별 중앙값과 Hook·문제별 패턴을 비교하고 Viral outlier는 별도 표시합니다.

## 12. 다음 실험에서 자동화할 병목

업종·주제에 맞는 배경 자산 선택과 실제 영상 시청 검토, Analytics CSV를 콘텐츠 ID와 결합하는 작업이 가장 반복적입니다. 충분한 표본과 검토 기준이 생기면 이 두 단계부터 자동화할 가치가 있습니다.

## 중복 방지 규칙

`AGENTS.md`에 두 채널과 숏츠·롱폼의 주제, Hook, 핵심 메시지 중복 금지 규칙을 기록했습니다. 새 초안 생성 프롬프트에는 기존 숏츠와 롱폼의 요약을 제공하고, 완전히 동일한 제목은 검증에서 거절합니다. 롱폼은 성과가 확인된 숏츠를 더 깊게 다룰 때만 `derivedFrom`을 남겨 제작합니다.
