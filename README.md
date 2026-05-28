# Career Radar MVP

GitHub Actions 기반으로 기술 아티클과 수동 등록 채용공고 링크를 매일 Slack으로 발송하는 초경량 자동화입니다.

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
export SLACK_WEBHOOK_URL="<Slack Incoming Webhook URL>"
npm run start
```

## 필수 환경변수

`SLACK_WEBHOOK_URL`

## 스케줄

매일 KST 10:30 실행

## 수동 채용공고 등록

`src/config/manual-job-urls.ts`에 채용공고 링크를 추가합니다.

## MVP 범위

- RSS 기술 아티클 수집
- DevDay archive 기술 아티클 수집
- 수동 채용공고 링크 발송
- 하루 최대 아티클 30개, 채용공고 30개 발송
- seen-items.json 기반 중복 제거
- Slack Webhook 발송

## 제외 범위

- AI 분석
- 채용공고 본문 추출
- DB
- 브라우저 크롤링
