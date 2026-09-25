# Shorts Factory POC

## 1. 프로젝트 목적

이 프로젝트는 **위메이크보이스 안내방송을 홍보하기 위한 YouTube Shorts 영상을 자동 생성하는 POC**다.

핵심 목표는 화려한 영상을 만드는 것이 아니다.

**안내방송 콘텐츠를 빠르게 대량 생산하고 실제 반응을 테스트할 수 있는 자동화 시스템**을 만드는 것이 목적이다.

최종적으로 아래 흐름을 자동화한다.

```text
콘텐츠 정보 입력
→ 안내방송 음성 생성
→ 자막 생성
→ 배경 영상 적용
→ 세로형 Shorts 영상 렌더링
→ MP4 파일 출력
```

CapCut 등 별도 편집 프로그램을 사용하지 않고 프로그램만으로 영상이 완성되어야 한다.

---

# 2. POC의 최우선 원칙

초기 버전에서는 기능을 최소화한다.

아래 기능은 구현하지 않는다.

* 회원가입
* 로그인
* 데이터베이스
* 관리자 페이지
* 복잡한 UI
* YouTube 자동 업로드
* AI 영상 생성
* SNS 자동 게시
* 영상 편집기
* 복잡한 애니메이션

POC에서는 **JSON 입력 → MP4 자동 생성**만 완성한다.

첫 번째 성공 기준은 아래 3개의 Shorts가 자동 생성되는 것이다.

1. 마트 폐점 안내방송
2. 아파트 층간소음 안내방송
3. 캠핑장 매너타임 안내방송

---

# 3. 기술 스택

가능하면 아래 기술을 사용한다.

```text
Runtime: Node.js 22+
Language: JavaScript
Video Rendering: FFmpeg
Audio: WeMakeVoice TTS API
Input: JSON
Output: MP4
```

추가 라이브러리는 필요한 경우에만 사용한다.

구조를 불필요하게 복잡하게 만들지 않는다.

---

# 4. 영상 기본 규격

YouTube Shorts에 최적화된 세로형 영상을 생성한다.

```text
Resolution: 1080x1920
Aspect Ratio: 9:16
Video Codec: H.264
Audio Codec: AAC
FPS: 30
Container: MP4
```

영상 길이는 콘텐츠에 따라 자동 결정한다.

목표 길이는 대략 **15~30초**다.

---

# 5. 기본 영상 구조

모든 영상은 기본적으로 세 구간으로 구성한다.

## INTRO

약 2~3초.

시청자가 영상 내용을 즉시 알 수 있도록 제목 또는 훅을 표시한다.

예:

```text
마트 사장님,
폐점 방송 이렇게 하세요 🔊
```

---

## CONTENT

실제 안내방송 음성을 재생한다.

음성에 맞춰 화면에 자막을 표시한다.

예:

```text
고객 여러분께 안내 말씀드립니다.

잠시 후 오후 10시,
매장 영업이 종료될 예정입니다.
```

배경에는 해당 업종과 관련된 영상 또는 이미지를 표시한다.

---

## OUTRO

약 2~3초.

브랜드를 자연스럽게 노출한다.

예:

```text
매일 반복되는 안내방송
위메이크보이스

wemakevoice.com
```

광고처럼 과도하게 보이지 않도록 한다.

콘텐츠 자체가 위메이크보이스 서비스의 데모가 되는 것이 가장 중요하다.

---

# 6. 콘텐츠 JSON 규격

초기에는 아래 JSON을 입력으로 사용한다.

```json
{
  "contents": [
    {
      "id": "mart-closing-001",
      "category": "mart",
      "title": "마트 폐점 안내방송",
      "hook": "마트 사장님, 폐점 방송 이렇게 하세요 🔊",
      "narration": "고객 여러분께 안내 말씀드립니다. 잠시 후 오후 10시 매장 영업이 종료될 예정입니다. 이용 중이신 고객 여러분께서는 구매하실 상품을 확인하시고 계산대를 이용해 주시기 바랍니다. 감사합니다.",
      "background": "mart-01.mp4",
      "brandText": "매일 반복되는 안내방송, 위메이크보이스",
      "website": "wemakevoice.com"
    }
  ]
}
```

---

# 7. 향후 확장을 고려한 콘텐츠 구조

콘텐츠 데이터 구조는 나중에 아래 형태로 확장할 수 있도록 설계한다.

```json
{
  "id": "camping-manner-001",
  "category": "camping",
  "topic": "매너타임",
  "title": "캠핑장 매너타임 안내방송",
  "hook": "캠핑장 매너타임 방송, 이렇게 하세요 🔊",
  "narration": "현재 시간부터 매너타임이 시작됩니다. 다른 이용객의 편안한 휴식을 위해 큰 소리의 대화와 음악 사용을 자제해 주시기 바랍니다.",
  "voice": {
    "name": "한여름",
    "speed": 10
  },
  "background": {
    "type": "video",
    "file": "camping-01.mp4"
  },
  "outro": {
    "text": "안내방송 자동화",
    "brand": "위메이크보이스",
    "website": "wemakevoice.com"
  }
}
```

하지만 POC에서는 필요한 필드만 먼저 구현한다.

---

# 8. 프로젝트 폴더 구조

초기 구조는 아래처럼 구성한다.

```text
shorts-factory/
│
├── initial.md
│
├── package.json
│
├── .env
│
├── .gitignore
│
├── src/
│   ├── index.js
│   ├── generateShort.js
│   ├── generateAudio.js
│   ├── generateSubtitle.js
│   ├── renderVideo.js
│   └── utils/
│
├── contents/
│   └── contents.json
│
├── assets/
│   ├── backgrounds/
│   │   ├── mart/
│   │   ├── apartment/
│   │   ├── camping/
│   │   ├── nursing-home/
│   │   └── common/
│   │
│   ├── fonts/
│   └── logo/
│
├── temp/
│   ├── audio/
│   ├── subtitles/
│   └── video/
│
└── output/
```

---

# 9. 실행 방식

초기에는 아래 명령 하나로 전체 콘텐츠를 생성할 수 있어야 한다.

```bash
npm run generate
```

또는

```bash
node src/index.js
```

실행하면 `contents/contents.json`을 읽어서 모든 콘텐츠를 순차적으로 영상으로 생성한다.

출력 예:

```text
output/
├── mart-closing-001.mp4
├── apartment-noise-001.mp4
└── camping-manner-001.mp4
```

---

# 10. 처리 흐름

각 콘텐츠는 아래 순서로 처리한다.

```text
contents.json 읽기

↓

콘텐츠 하나 선택

↓

narration으로 TTS 음성 생성

↓

음성 길이 확인

↓

자막 생성

↓

배경 영상 준비

↓

Intro 생성

↓

음성 + 자막 + 배경 합성

↓

Outro 생성

↓

전체 영상 연결

↓

1080x1920 MP4 출력
```

---

# 11. TTS

안내방송 음성은 가능한 경우 **WeMakeVoice TTS API**를 사용한다.

TTS 관련 코드는 반드시 별도 모듈로 분리한다.

```text
generateAudio.js
```

함수 형태 예:

```javascript
async function generateAudio({
  text,
  voiceName,
  speed,
  outputPath
}) {
}
```

POC 초기 단계에서 실제 WeMakeVoice API 연결이 어려운 경우 임시 MP3 파일을 사용할 수 있도록 한다.

즉, 영상 생성 로직과 TTS 로직은 서로 독립적으로 만들어야 한다.

---

# 12. 자막

자막은 자동 생성한다.

초기 버전에서는 음성 인식으로 타임코드를 추출할 필요는 없다.

`narration` 텍스트를 자연스럽게 문장 단위로 분리하고 전체 음성 길이를 기준으로 자막 시간을 배분한다.

예:

```text
00:00:03.000 --> 00:00:06.500
고객 여러분께 안내 말씀드립니다.

00:00:06.500 --> 00:00:11.000
잠시 후 오후 10시
매장 영업이 종료될 예정입니다.
```

SRT 또는 ASS 형식을 사용할 수 있다.

스타일 제어가 쉽다면 ASS를 우선 고려한다.

---

# 13. 자막 스타일

모바일에서 즉시 읽을 수 있어야 한다.

기본 가이드:

```text
위치: 화면 중앙보다 약간 아래
글자 크기: 크게
한 화면 최대 2~3줄
문장 길이가 길 경우 자동 줄바꿈
배경과 명확하게 구분
```

자막이 화면 가장 아래까지 내려가지 않도록 한다.

YouTube Shorts UI와 겹칠 가능성을 고려한다.

---

# 14. 배경 영상

POC에서는 생성형 AI 영상 API를 사용하지 않는다.

미리 준비된 짧은 배경 영상을 반복 활용한다.

예:

```text
assets/backgrounds/mart/
mart-01.mp4
mart-02.mp4
mart-03.mp4
```

영상 길이가 부족한 경우 FFmpeg로 자연스럽게 반복한다.

원본 영상의 비율이 달라도 최종적으로 1080x1920에 맞춘다.

가능하면 중앙 crop 방식을 사용한다.

---

# 15. 영상 디자인 원칙

영상의 목적은 시각적 화려함이 아니다.

다음 세 가지가 중요하다.

### 1. 첫 2초에 무슨 콘텐츠인지 알 수 있어야 한다.

### 2. 안내방송 음성이 가장 중요하다.

### 3. 문구를 그대로 가져다 사용할 수 있어야 한다.

따라서 과도한 효과나 전환 효과를 사용하지 않는다.

---

# 16. Hook 작성 원칙

제목보다 시청자의 상황을 직접 건드리는 표현을 우선한다.

예:

```text
마트 사장님, 폐점 방송 이렇게 하세요 🔊
```

```text
캠핑장 매너타임 방송이 필요하다면?
```

```text
아파트 층간소음 민원,
이렇게 방송해보세요.
```

```text
요양원에서 매일 사용하는 안내방송
```

---

# 17. 콘텐츠 카테고리

초기 콘텐츠 카테고리는 아래를 우선한다.

```text
mart
apartment
camping
nursing-home
hospital
gym
factory
kids-cafe
office
parking
```

카테고리는 계속 추가할 수 있도록 하드코딩을 최소화한다.

---

# 18. 첫 번째 테스트 콘텐츠

## 마트

```json
{
  "id": "mart-closing-001",
  "category": "mart",
  "title": "마트 폐점 안내방송",
  "hook": "마트 사장님, 폐점 방송 이렇게 하세요 🔊",
  "narration": "고객 여러분께 안내 말씀드립니다. 잠시 후 매장 영업이 종료될 예정입니다. 이용 중이신 고객 여러분께서는 구매하실 상품을 확인하시고 계산대를 이용해 주시기 바랍니다. 오늘도 저희 매장을 이용해 주셔서 감사합니다.",
  "background": "mart-01.mp4"
}
```

---

## 아파트

```json
{
  "id": "apartment-noise-001",
  "category": "apartment",
  "title": "아파트 층간소음 안내방송",
  "hook": "층간소음 민원, 이렇게 방송해보세요 🔊",
  "narration": "입주민 여러분께 안내 말씀드립니다. 늦은 시간에는 뛰거나 가구를 이동하는 등 이웃 세대에 소음이 전달될 수 있는 행동을 자제해 주시기 바랍니다. 서로를 배려하는 쾌적한 공동주택 문화를 위해 입주민 여러분의 협조를 부탁드립니다.",
  "background": "apartment-01.mp4"
}
```

---

## 캠핑장

```json
{
  "id": "camping-manner-001",
  "category": "camping",
  "title": "캠핑장 매너타임 안내방송",
  "hook": "캠핑장 매너타임 방송, 이렇게 하세요 🔊",
  "narration": "캠핑장 이용객 여러분께 안내드립니다. 지금부터 매너타임이 시작됩니다. 다른 이용객의 편안한 휴식을 위해 큰 소리의 대화와 음악 사용을 자제해 주시기 바랍니다. 모두가 즐거운 캠핑을 할 수 있도록 협조 부탁드립니다.",
  "background": "camping-01.mp4"
}
```

---

# 19. 오류 처리

콘텐츠 하나에서 오류가 발생하더라도 전체 작업이 중단되지 않도록 한다.

예:

```text
✓ mart-closing-001 생성 완료

✗ apartment-noise-001 생성 실패
  Reason: background file missing

✓ camping-manner-001 생성 완료
```

마지막에는 결과를 요약한다.

```text
Generation Complete

Success: 2
Failed: 1
Total: 3
```

---

# 20. 임시 파일 관리

렌더링 과정에서 생성되는 임시 파일은 `temp/`에 저장한다.

영상 생성이 성공하면 해당 콘텐츠의 임시 파일은 삭제할 수 있도록 한다.

디버깅을 위해 아래 옵션을 둘 수 있다.

```text
KEEP_TEMP_FILES=true
```

---

# 21. 환경변수

API Key 및 환경 설정은 `.env`에서 관리한다.

예:

```env
WEMAKEVOICE_API_URL=
WEMAKEVOICE_API_KEY=

DEFAULT_VOICE=한여름
DEFAULT_SPEED=10

KEEP_TEMP_FILES=false
```

민감한 키를 코드에 직접 작성하지 않는다.

---

# 22. 코드 작성 원칙

다음 원칙을 따른다.

* 기능별 파일 분리
* async/await 사용
* 명확한 함수명
* 불필요한 클래스 사용 금지
* 과도한 추상화 금지
* POC 단계에서는 단순성을 최우선
* 오류 메시지를 사람이 이해할 수 있게 출력
* FFmpeg 명령은 코드상에서 확인하기 쉽게 구성

---

# 23. POC 완료 조건

아래 조건을 모두 만족하면 POC v1 완료로 본다.

* `npm run generate` 실행 가능
* JSON을 읽을 수 있음
* WeMakeVoice 또는 테스트 음성으로 MP3 생성 가능
* 안내문 자막 자동 생성
* 배경 영상 적용
* Intro 표시
* 안내방송 본문 표시
* Outro 브랜드 표시
* 1080x1920 MP4 생성
* 콘텐츠 3개 일괄 생성 가능
* CapCut 등 수동 편집 필요 없음

---

# 24. POC 이후 단계

POC가 성공하고 실제 Shorts를 업로드한 이후에만 다음 기능을 검토한다.

## Phase 2

```text
AI 주제 생성
AI 안내방송 문구 생성
AI Hook 생성
제목 자동 생성
설명 자동 생성
해시태그 자동 생성
카테고리별 대량 생성
```

예:

```text
"캠핑장 콘텐츠 20개 만들어줘"
```

라고 입력하면 20개의 콘텐츠 JSON을 자동 생성하는 구조.

---

## Phase 3

콘텐츠 생성부터 영상까지 완전 자동화한다.

```text
업종 선택
↓
AI 주제 선정
↓
AI 문구 작성
↓
WeMakeVoice TTS
↓
영상 렌더링
↓
MP4
```

---

## Phase 4

실제 성과가 확인될 경우 아래를 검토한다.

```text
YouTube API 업로드
Instagram Reels
TikTok
게시 일정 관리
조회수 데이터 수집
콘텐츠 성과 분석
잘 되는 업종 자동 추천
```

---

# 25. 가장 중요한 제품 철학

이 프로젝트는 **AI 영상 제작 서비스**가 아니다.

이 프로젝트의 목적은

> **사업장에서 실제 사용할 수 있는 안내방송 콘텐츠를 가장 빠르고 저렴하게 대량 생산하는 것**

이다.

화려한 영상 하나를 만드는 것보다

```text
100개의 유용한 콘텐츠를
사람 손을 거의 사용하지 않고 만드는 것
```

을 우선한다.

콘텐츠가 곧 위메이크보이스의 실제 사용 사례이자 광고가 되도록 한다.

---

# 26. 개발 시작 지시

먼저 전체 기능을 한 번에 구현하지 않는다.

아래 순서대로 개발한다.

```text
STEP 1
프로젝트 기본 구조 생성

STEP 2
contents.json 읽기

STEP 3
테스트 MP3 + 배경영상으로
1080x1920 영상 1개 생성

STEP 4
Intro / Content / Outro 구현

STEP 5
자막 구현

STEP 6
WeMakeVoice TTS 연결

STEP 7
3개 콘텐츠 일괄 생성

STEP 8
오류 처리 및 temp 정리
```

각 STEP 완료 시 실제 실행 테스트를 수행한다.

기존에 정상적으로 동작하는 기능을 불필요하게 리팩터링하지 않는다.

**첫 번째 목표는 `mart-closing-001.mp4` 한 개를 완성하는 것이다.**
