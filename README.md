# Shorts Factory

콘텐츠 데이터에서 TTS, 자막, Remotion 영상, YouTube 예약과 성과 학습까지 연결하는 제작·실험 시스템이다.

## 핵심 명령

```bash
npm run content:catalog
npm run growth:audit
npm run youtube:test
npm run studio
```

- `content:catalog`: 흩어진 base, batch, long-form, project round 데이터를 `data/content-catalog.json` 하나로 통합한다.
- `growth:audit`: 삶의여백을 중심으로 도달·공감·수익 연료 상태와 롱폼 후보를 판정한다.
- `youtube:test`: 콘텐츠, 음성 교차, 자막, 채널 분리, 예약, 추적 링크 규칙을 검증한다.

## 데이터 구조

- `contents/contents.json`: 초기 콘텐츠
- `contents/batches/`: 실험과 생산 배치
- `contents/longform/`: 롱폼 콘텐츠
- `projects/*/rounds/*/contents.json`: 독립 프로젝트 라운드
- `data/content-catalog.json`: 위 소스를 자동 발견해 만든 통합 조회 인덱스
- `config/growth-operating-system.json`: 성장·확장·수익 실험의 단일 판단 기준

기존 파일을 이동하지 않고 통합 카탈로그 계층이 모든 활성 소스를 자동 발견한다. 새 라운드를 추가해도 로더 코드를 수정하지 않는다.

## Git 정책

GitHub에는 코드, 콘텐츠 JSON, 설정, 테스트, 운영 이력만 저장한다. 다음은 로컬에만 둔다.

- `.env`, OAuth 토큰
- MP4, MP3, PCM, 이미지와 생성 배경
- 렌더 출력, temp, 로그

매일 21:30 KST에 `scripts/dailyGitSnapshot.sh`가 카탈로그 갱신과 테스트를 통과한 변경만 지정된 `ij0209/shorts-factory` 저장소에 push한다.

## 성장 원칙

생산량이 아니라 `도달 → 공감 → 재방문 → 소유 고객 → 유료 수요 → 반복 매출`을 최적화한다. 상세 기준은 [FASTLANE_OPERATING_SYSTEM.md](docs/FASTLANE_OPERATING_SYSTEM.md)를 따른다.
