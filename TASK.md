# TASK: Daily Career Radar 자동 채용공고 수집 반영

## 목표

매일 KST 10:30에 GitHub Actions가 실행되어 최신 기술 아티클과 신규 채용공고 링크를 Slack으로 발송한다.

## 현재 구현 범위

- GitHub Actions cron 실행: `30 1 * * *`
- Slack Incoming Webhook 발송
- 기술 아티클과 채용공고를 서로 다른 Slack 채널로 분리 발송
- 아티클/채용공고 발송 격리 및 성공한 쪽만 상태 저장
- 부분 실패 발생 시 성공한 쪽 상태 저장 후 workflow 실패 처리
- seen 상태 TTL/최대 개수 pruning
- DevDay 최신 페이지 기반 기술 아티클 우선 수집
- RSS 기반 기술 아티클 수집
- DevDay archive 기반 기술 아티클 수집
- JobKorea/Saramin 검색 URL 기반 Node.js/NestJS 백엔드 채용공고 수집
- 채용공고 상세 페이지 본문 추출
- 규칙 기반 채용공고 적합도 점수화
- 보조 수동 채용공고 URL 발송
- `data/seen-items.json` 기반 중복 제거
- 하루 최대 기술 아티클 30개, 채용공고 30개 발송
- 신규 데이터가 없어도 Slack 상태 메시지 발송
- 실행 후 `seen-items.json` 자동 커밋

## 기술 아티클 수집 방식

아티클 수집은 아래 우선순위로 수행한다.

1. `https://devday.kr/` 최신 페이지
2. `https://devday.kr/archive` archive 페이지
3. 직접 RSS fallback

DevDay 최신 페이지는 여러 기술 블로그와 뉴스 링크를 모아 최신순으로 보여주는 aggregator이므로 1차 소스로 사용한다. DevDay archive와 RSS는 보강 및 fallback 소스로 유지한다.

## 채용공고 자동 수집 방식

`src/config/job-sources.ts`에 채용공고 검색 페이지를 등록한다.

수집기는 각 source에 대해 아래 순서로 동작한다.

1. `axios`로 검색 페이지 HTML 요청
2. `cheerio`로 HTML 파싱
3. 모든 `a` 태그 순회
4. `href`를 절대 URL로 변환
5. tracking query와 hash 제거
6. `includeUrlPatterns`와 `excludeUrlPatterns`로 채용공고 후보 필터링
7. provider별 최대 15개 후보 제한
8. URL 기준 중복 제거
9. 기존 발송 이력 제거
10. 상세 페이지 본문 추출
11. Node.js/NestJS 필수 키워드 기반 2차 필터링
12. 회사명 기준 중복 제거
13. 규칙 기반 적합도 점수 계산
14. 점수 높은 순 정렬
15. 최대 30개만 Slack 발송
16. 채용공고 Slack 발송 성공 시 실제 발송한 URL만 `seen-items.json`에 저장

기본 검색 소스:

- JobKorea Node.js 최신순
- JobKorea NestJS 최신순
- Saramin Node.js 최신순
- Saramin NestJS 최신순

필터 결과가 30개 미만이면 있는 것만 Slack으로 보낸다.

## 채용공고 적합도 점수화

OpenAI 없이 keyword rule 기반으로 계산한다.

- 기술스택 매칭: 최대 40점
- 도메인/업무 매칭: 최대 30점
- 커리어 방향성 매칭: 최대 15점
- 조직/근무 리스크 감점: 최대 -15점

판정 기준:

```txt
85~100  → 적극 지원
70~84   → 우선 검토
55~69   → 조건부 검토
0~54    → 스킵
```

Slack 메시지에는 적합도 점수, 판정, 매칭 포인트, 주의 포인트, 링크를 표시한다.

## Slack 발송 격리

아티클과 채용공고는 각각 독립적으로 발송한다.

```txt
아티클 수집 → 아티클 Slack 발송 → 성공 시 seenArticles 업데이트
채용공고 수집 → 채용공고 Slack 발송 → 성공 시 seenJobs 업데이트
```

한쪽 Slack 발송이 실패해도 다른 쪽 발송은 계속 수행한다. 성공한 쪽의 seen 상태는 저장한다. 단, 하나라도 실패하면 GitHub Actions는 실패로 표시한다.

`Commit updated state` step은 `if: always()`로 실행해 부분 실패 상황에서도 성공한 쪽의 `seen-items.json` 변경분을 커밋할 수 있게 한다.

## 상태 저장 정책

`data/seen-items.json`은 URL과 발송 시각을 함께 저장한다.

```json
{
  "seenArticles": [
    {
      "url": "https://example.com/article",
      "seenAt": "2026-05-28T01:30:00.000Z"
    }
  ],
  "seenJobs": [
    {
      "url": "https://example.com/job",
      "seenAt": "2026-05-28T01:30:00.000Z"
    }
  ],
  "updatedAt": "2026-05-28T01:30:00.000Z"
}
```

저장 시 아래 기준으로 자동 정리한다.

- 아티클 seen 보관 기간: 180일
- 채용공고 seen 보관 기간: 90일
- 아티클 최대 보관 개수: 5,000개
- 채용공고 최대 보관 개수: 5,000개

기존 `seenArticleUrls`, `seenJobUrls` 배열 구조도 읽을 수 있게 migration 호환을 유지한다.

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
