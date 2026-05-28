# Career Radar MVP

GitHub Actions 기반으로 기술 아티클과 감시 대상 채용 페이지의 신규 공고 링크를 매일 Slack으로 발송하는 초경량 자동화입니다.

## 실행

```bash
npm install
npm run typecheck
npm run start
```

## 수동 테스트

Slack 연동 없이 메시지 포맷과 수집 흐름을 확인할 때:

```bash
npm run run:mock
```

`run:mock`은 Slack 발송과 `data/seen-items.json` 저장을 건너뜁니다.

실제 Slack 발송 테스트:

```bash
export ARTICLE_SLACK_WEBHOOK_URL="<Article channel Slack Incoming Webhook URL>"
export JOB_SLACK_WEBHOOK_URL="<Job channel Slack Incoming Webhook URL>"
npm run start
```

## 필수 환경변수

- `ARTICLE_SLACK_WEBHOOK_URL`
- `JOB_SLACK_WEBHOOK_URL`

## 스케줄

매일 KST 10:30 실행

## 기술 아티클 수집

아티클은 아래 우선순위로 수집합니다.

1. DevDay 최신 페이지: `https://devday.kr/`
2. DevDay archive: `https://devday.kr/archive`
3. 직접 RSS fallback: Toss Tech, LINE Engineering

DevDay 최신 페이지가 여러 기술 블로그와 뉴스를 모아 최신순으로 제공하므로 1차 소스로 사용합니다. RSS는 DevDay 장애나 구조 변경에 대비한 fallback 성격으로 유지합니다.

## 채용공고 자동 수집

`src/config/job-sources.ts`에 감시할 채용공고 검색 페이지를 등록합니다.

기본 등록된 소스:

- JobKorea Node.js 최신순 검색
- JobKorea NestJS 최신순 검색
- Saramin Node.js 최신순 검색
- Saramin NestJS 최신순 검색

수집기는 각 검색 페이지의 HTML을 가져온 뒤 `a` 태그에서 채용공고 링크 후보를 추출합니다. 이후 상세 페이지 본문을 가져와 Node.js/NestJS 키워드를 다시 검사하고, 규칙 기반 적합도 점수를 계산합니다.

정적 HTML에서 공고 링크가 보이지 않는 사이트는 신규 공고를 가져오지 못할 수 있으며, 해당 소스는 경고 로그만 남기고 전체 실행은 계속됩니다.

채용공고는 provider별로 최대 15개씩 후보를 가져오고, 회사명이 같은 공고는 중복으로 보고 하나만 남깁니다. 필터 결과가 30개 미만이면 있는 것만 Slack으로 보냅니다.

## 채용공고 적합도 점수

OpenAI 없이 JD 텍스트를 keyword rule로 분석합니다.

- 기술스택 매칭: 최대 40점
- 도메인/업무 매칭: 최대 30점
- 커리어 방향성 매칭: 최대 15점
- 조직/근무 리스크 감점: 최대 -15점

Slack 메시지에는 각 공고의 적합도 점수, 판정, 매칭 포인트, 주의 포인트를 표시합니다.

## 보조 수동 등록

자동 수집이 어려운 공고가 있을 때만 `src/config/manual-job-urls.ts`에 개별 채용공고 링크를 추가합니다. 이 목록은 보조 fallback 용도입니다.

## MVP 범위

- RSS 기술 아티클 수집
- DevDay archive 기술 아티클 수집
- 등록된 채용 페이지에서 신규 채용공고 링크 자동 수집
- Node.js/NestJS 백엔드 채용공고 필터링
- 채용공고 상세 본문 추출
- 규칙 기반 적합도 점수화
- 보조 수동 채용공고 링크 발송
- 하루 최대 아티클 30개, 채용공고 30개 발송
- seen-items.json 기반 중복 제거
- 기술 아티클/채용공고 채널 분리 Slack Webhook 발송
- 아티클/채용공고 발송 격리
- 성공한 발송만 seen 상태 업데이트
- seen 상태 TTL/최대 개수 pruning

## 상태 저장 정책

`data/seen-items.json`은 URL과 발송 시각을 함께 저장합니다.

- 아티클 seen 보관: 최대 180일, 최대 5,000개
- 채용공고 seen 보관: 최대 90일, 최대 5,000개
- 저장 시 오래된 항목과 초과 항목은 자동 정리

아티클 Slack 발송과 채용공고 Slack 발송은 서로 격리됩니다. 한쪽이 실패해도 다른 쪽은 발송될 수 있으며, 성공한 쪽만 seen 상태에 기록됩니다. 단, 부분 실패가 있으면 GitHub Actions는 실패로 표시되어 확인할 수 있습니다.

부분 실패가 발생해도 성공한 쪽의 `seen-items.json` 변경분은 workflow의 commit step에서 저장됩니다.

## 제외 범위

- AI 분석
- 채용공고 본문 추출
- DB
- 브라우저 크롤링
- 로그인 기반 사이트 접근
