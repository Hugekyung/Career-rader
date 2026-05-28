# TASK: Daily Career Radar 자동 채용공고 수집 반영

## 목표

매일 KST 10:30에 GitHub Actions가 실행되어 최신 기술 아티클과 신규 채용공고 링크를 Slack으로 발송한다.

## 현재 구현 범위

- GitHub Actions cron 실행: `30 1 * * *`
- Slack Incoming Webhook 발송
- 기술 아티클과 채용공고를 서로 다른 Slack 채널로 분리 발송
- RSS 기반 기술 아티클 수집
- DevDay archive 기반 기술 아티클 수집
- 감시 대상 채용 페이지 HTML에서 신규 채용공고 링크 수집
- 보조 수동 채용공고 URL 발송
- `data/seen-items.json` 기반 중복 제거
- 하루 최대 기술 아티클 30개, 채용공고 30개 발송
- 신규 데이터가 없어도 Slack 상태 메시지 발송
- 실행 후 `seen-items.json` 자동 커밋

## 채용공고 자동 수집 방식

`src/config/job-sources.ts`에 채용공고 목록 페이지를 등록한다.

수집기는 각 source에 대해 아래 순서로 동작한다.

1. `axios`로 목록 페이지 HTML 요청
2. `cheerio`로 HTML 파싱
3. 모든 `a` 태그 순회
4. `href`를 절대 URL로 변환
5. tracking query와 hash 제거
6. `includeUrlPatterns`와 `excludeUrlPatterns`로 채용공고 후보 필터링
7. URL 기준 중복 제거
8. 기존 발송 이력 제거
9. 최대 30개만 Slack 발송
10. 실제 발송한 URL만 `seen-items.json`에 저장

## 기본 채용공고 소스

- Zighang: `https://zighang.com/recruitment`
- Wanted: `https://www.wanted.co.kr/wdlist`
- JobKorea: `https://www.jobkorea.co.kr/recruit/joblist?localorder=1&menucode=local`
- Saramin: `https://www.saramin.co.kr/zf_user/jobs/public/list`

## 사이트별 주의사항

- JobKorea와 Saramin은 HTML에서 채용공고 링크 후보를 추출할 수 있다.
- Wanted의 `/wdlist`는 HTML에 실제 포지션 링크가 제한적으로만 노출될 수 있다.
- Zighang의 `/recruitment`는 현재 HTML 기준 공고 링크가 보이지 않고 동적 로딩 가능성이 있다.
- 정적 HTML에 공고 링크가 없으면 브라우저 크롤링 없이 수집할 수 없다.

## 제외 범위

- OpenAI API 연동
- AI 기반 JD 분석
- 채용공고 상세 페이지 본문 추출
- 검색 API 기반 전역 채용공고 수집
- Playwright/Puppeteer 기반 브라우저 크롤링
- 로그인 기반 사이트 접근
- DB 사용
- Notion 저장
- 대시보드 구현

## 수동 연동 작업

1. Slack App 생성
2. Incoming Webhooks 활성화
3. GitHub repository secret `ARTICLE_SLACK_WEBHOOK_URL` 등록
4. GitHub repository secret `JOB_SLACK_WEBHOOK_URL` 등록
5. GitHub Actions workflow permission을 Read and write로 설정
6. 필요 시 `src/config/job-sources.ts`에 감시 대상 채용 페이지 추가
